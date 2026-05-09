import type { MarkAccentApiResponse, MarkAccentApiResultEntry } from '../word/accentTypes';

export type FetchMarkAccentResult =
    | {
          ok: true;
          result: MarkAccentApiResultEntry[];
      }
    | {
          ok: false;
          reason: 'network' | 'invalid-response';
      };

export async function fetchMarkAccent(text: string): Promise<FetchMarkAccentResult> {
    try {
        const response = await fetch('/api/mark-accent', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text }),
        });

        const data: MarkAccentApiResponse = await response.json();
        if (response.ok && data.status === 200 && Array.isArray(data.result)) {
            return {
                ok: true,
                result: data.result,
            };
        }

        console.error('API format error:', data);
        return {
            ok: false,
            reason: 'invalid-response',
        };
    } catch (error) {
        console.error('API error:', error);
        return {
            ok: false,
            reason: 'network',
        };
    }
}
