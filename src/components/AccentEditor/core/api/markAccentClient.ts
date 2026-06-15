import type { MarkAccentApiResultEntry } from '../word/accentTypes';

export interface MarkAccentStreamChunk {
    chunk: number;
    subchunk: number;
    result: MarkAccentApiResultEntry[];
}

export type StreamMarkAccentResult =
    | { ok: true }
    | { ok: false; reason: 'network' | 'invalid-response' | 'aborted' };

interface StreamMarkAccentOptions {
    accessToken: string;
    signal?: AbortSignal;
    onChunk: (chunk: MarkAccentStreamChunk) => void;
}

function parseStreamLine(line: string): MarkAccentStreamChunk | null {
    const trimmed = line.trim();
    if (trimmed === '') {
        return null;
    }

    try {
        const parsed = JSON.parse(trimmed) as {
            chunk?: number;
            subchunk?: number;
            status?: number;
            result?: MarkAccentApiResultEntry[] | null;
            error?: unknown;
        };

        if (
            typeof parsed.chunk !== 'number' ||
            typeof parsed.subchunk !== 'number' ||
            parsed.status !== 200 ||
            !Array.isArray(parsed.result)
        ) {
            return null;
        }

        return {
            chunk: parsed.chunk,
            subchunk: parsed.subchunk,
            result: parsed.result,
        };
    } catch (error) {
        console.error('Stream chunk parse error:', error, line);
        return null;
    }
}

export async function streamMarkAccent(
    text: string,
    { accessToken, onChunk, signal }: StreamMarkAccentOptions,
): Promise<StreamMarkAccentResult> {
    try {
        const response = await fetch('/api/mark-accent/stream', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text }),
            signal,
        });

        if (!response.ok || !response.body) {
            console.error('Stream response error:', response.status);
            return { ok: false, reason: 'invalid-response' };
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                break;
            }

            buffer += decoder.decode(value, { stream: true });

            let newlineIndex = buffer.indexOf('\n');
            while (newlineIndex !== -1) {
                const line = buffer.slice(0, newlineIndex);
                buffer = buffer.slice(newlineIndex + 1);
                const chunk = parseStreamLine(line);
                if (chunk) {
                    onChunk(chunk);
                }
                newlineIndex = buffer.indexOf('\n');
            }
        }

        buffer += decoder.decode();
        if (buffer.length > 0) {
            const chunk = parseStreamLine(buffer);
            if (chunk) {
                onChunk(chunk);
            }
        }

        return { ok: true };
    } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
            return { ok: false, reason: 'aborted' };
        }
        console.error('Stream API error:', error);
        return { ok: false, reason: 'network' };
    }
}
