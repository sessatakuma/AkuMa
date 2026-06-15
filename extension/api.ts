(function registerAkumaExtensionApi(globalScope: typeof globalThis) {
    const runtimeScope = globalScope as unknown as Window;
    runtimeScope.AKUMA_EXTENSION ??= {};
    const namespace = runtimeScope.AKUMA_EXTENSION;

    async function markAccent(text: string): Promise<AkumaMarkAccentEntry[]> {
        const apiBaseUrl = namespace.config?.apiBaseUrl || 'https://akuma.sessatakuma.dev';
        const response = await fetch(`${apiBaseUrl.replace(/\/$/u, '')}/api/mark-accent/stream`, {
            body: JSON.stringify({ text }),
            headers: {
                'Content-Type': 'application/json',
            },
            method: 'POST',
        });

        if (!response.ok || !response.body) {
            throw new Error(`AkuMa API failed with status ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        const result: AkumaMarkAccentEntry[] = [];
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                break;
            }

            buffer += decoder.decode(value, { stream: true });
            buffer = readBufferedLines(buffer, result);
        }

        buffer += decoder.decode();
        readBufferedLines(`${buffer}\n`, result);

        return result;
    }

    function readBufferedLines(buffer: string, result: AkumaMarkAccentEntry[]) {
        let newlineIndex = buffer.indexOf('\n');
        while (newlineIndex !== -1) {
            const line = buffer.slice(0, newlineIndex).trim();
            buffer = buffer.slice(newlineIndex + 1);
            if (line.length > 0) {
                appendStreamLine(line, result);
            }
            newlineIndex = buffer.indexOf('\n');
        }
        return buffer;
    }

    function appendStreamLine(line: string, result: AkumaMarkAccentEntry[]) {
        const parsed = JSON.parse(line) as {
            result?: AkumaMarkAccentEntry[];
            status?: number;
        };

        if (parsed.status === 200 && Array.isArray(parsed.result)) {
            result.push(...parsed.result);
        }
    }

    namespace.api = {
        markAccent,
    };
})(globalThis);
