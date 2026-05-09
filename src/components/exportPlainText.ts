import { getAccentArray, getAccentNumberFromArray, getReadingFromFurigana } from 'hooks/accent';

import { placeholder } from './placeholder';

import type { Word } from './accentTypes';

export function buildPlainTextExport(words: Word[], showAccent: boolean): string {
    return words
        .map(word => {
            const accentIndex = getAccentNumberFromArray(getAccentArray(word));
            const reading = getReadingFromFurigana(word.furigana)
                .replaceAll(placeholder, '')
                .trim();

            if (!showAccent) {
                if (reading.length > 0 && word.surface !== reading) {
                    return `${word.surface}（${reading}）`;
                }

                return word.surface;
            }

            if (reading.length > 0 && word.surface !== reading) {
                return `${word.surface}（${reading}｜${accentIndex}）`;
            }

            return `${word.surface}（${accentIndex}）`;
        })
        .join('');
}
