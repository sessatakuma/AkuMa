import { AccentValue, type AccentValueType, type FuriganaItem, type Word } from 'utilities/types';

export function cloneWords(words: Word[]): Word[] {
    return words.map(word => ({
        surface: word.surface,
        furigana: word.furigana.map(item => ({ ...item })),
        accent: Array.isArray(word.accent) ? [...word.accent] : word.accent,
    }));
}

export function getAccentArray(word: Word): AccentValueType[] {
    if (word.furigana.length > 0 && word.furigana.some(item => item.text.trim() !== '')) {
        return word.furigana.map(item => item.accent);
    }

    return Array.isArray(word.accent) ? word.accent : [];
}

export function getAccentNumberFromArray(accents: AccentValueType[]): number {
    const dropIndex = accents.findIndex(accent => accent === AccentValue.Drop);
    if (dropIndex !== -1) {
        return dropIndex + 1;
    }

    const highIndices = accents.flatMap((accent, index) =>
        accent === AccentValue.High ? [index] : [],
    );

    // Some upstream or manually-edited words only preserve the first high mora.
    if (highIndices.length === 1 && highIndices[0] === 0) {
        return 1;
    }

    return 0;
}

export function getReadingFromFurigana(furigana: FuriganaItem[]): string {
    return furigana.map(item => item.text).join('');
}
