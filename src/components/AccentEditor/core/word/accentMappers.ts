import isKana from '../kana/isKana';
import { splitKanaSyllables } from '../kana/kanaUtils';

import { AccentValue, type MarkAccentApiResultEntry, type Word } from './accentTypes';

export function mapApiResultToWords(result: MarkAccentApiResultEntry[]): Word[] {
    return result.map(word => {
        const kanaWord = isKana(word.surface);

        return {
            surface: word.surface,
            furigana: kanaWord
                ? []
                : word.accent.length > 0
                  ? word.accent.map(item => ({
                        text: item.furigana,
                        accent: item.accent_marking_type as Word['furigana'][number]['accent'],
                    }))
                  : [{ text: '', accent: AccentValue.None }],
            accent: kanaWord
                ? word.accent.map(item => item.accent_marking_type as Word['furigana'][number]['accent'])
                : AccentValue.None,
        };
    });
}

export function mapFallbackTextToWords(text: string): Word[] {
    const segmenter = new Intl.Segmenter('ja', { granularity: 'word' });

    return [...segmenter.segment(text)].map(segment => ({
        surface: segment.segment,
        furigana: isKana(segment.segment) ? [] : [{ text: '', accent: AccentValue.None }],
        accent: isKana(segment.segment)
            ? splitKanaSyllables(segment.segment).map(() => AccentValue.None)
            : AccentValue.None,
    }));
}
