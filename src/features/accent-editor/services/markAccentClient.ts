import type { MarkAccentApiResponse, MarkAccentApiResultEntry } from '../domain/types';

export async function fetchMarkAccent(text: string): Promise<MarkAccentApiResultEntry[]> {
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
            return data.result;
        }

        console.error('API format error:', data);
        return [];
    } catch (error) {
        console.error('API error:', error);
        return [];
    }
}
