import isKana from 'utilities/isKana';
import { splitKanaSyllables } from 'utilities/kanaUtils';

interface AccentEntry {
    furigana: string;
    accent_marking_type: number;
}

interface APIResultEntry {
    surface: string;
    furigana: string;
    accent: AccentEntry[];
}

interface APIResponse {
    status: number;
    result: APIResultEntry[];
}

interface ProcessedWord {
    surface: string;
    furigana: string | string[];
    accent: AccentEntry[];
}

const DEFAULT_DEV_MARK_ACCENT_API_URL = 'https://accent-marker.hsichen.dev/api/mark-accent';

function getMarkAccentApiUrl(): string {
    const configuredApiUrl = import.meta.env.VITE_MARK_ACCENT_API_URL?.trim();
    if (configuredApiUrl) {
        return configuredApiUrl;
    }

    if (import.meta.env.DEV) {
        return DEFAULT_DEV_MARK_ACCENT_API_URL;
    }

    return '/api/mark-accent';
}

export async function fetchFuriganaFromAPI(text: string): Promise<ProcessedWord[]> {
    try {
        const response = await fetch(getMarkAccentApiUrl(), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text }),
        });

        const data: APIResponse = await response.json();

        if (response.ok && data.status === 200 && Array.isArray(data.result)) {
            return data.result.map((entry: APIResultEntry) => {
                let furigana: string | string[] = entry.furigana;
                if (isKana(entry.surface)) furigana = '';
                else furigana = splitKanaSyllables(furigana as string);
                return {
                    surface: entry.surface,
                    furigana,
                    accent: entry.accent,
                };
            });
        } else {
            console.error('API format error:', data);
            return [];
        }
    } catch (error) {
        console.error('API error:', error);
        return [];
    }
}
