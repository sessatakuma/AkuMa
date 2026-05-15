import { placeholder } from '../../constant/placeholder';
import isKana from '../kana/isKana';
import { splitKanaSyllables } from '../kana/kanaUtils';

import type { AccentValueType, Word } from './accentTypes';

export const rubyScale = 0.6;

export function getLineBreakCount(surface: string): number {
    const matches = surface.match(/\r?\n/g);
    return matches ? matches.length : 0;
}

interface LayoutMetrics {
    baseCellWidthsEm: number[];
    groupWidthEm: number;
    readingCellWidthsEm: number[];
}

export interface WordAnnotationModel {
    annotatedReading: string[];
    annotatedStartIndex: number;
    annotatedSurface: string[];
    baseCellWidthsEm: number[];
    groupWidthEm: number;
    isKanaWord: boolean;
    kanaAccents: AccentValueType[] | null;
    prefixSurface: string[];
    readingCellWidthsEm: number[];
    surfaceSegments: string[];
    suffixSurface: string[];
    trailingHiddenReadingCount: number;
}

function getSurfaceSegments(word: Word): string[] {
    return isKana(word.surface) && Array.isArray(word.accent)
        ? splitKanaSyllables(word.surface)
        : [...word.surface];
}

function getReadingSegments(word: Word, surfaceSegments: string[]): string[] {
    if (isKana(word.surface)) {
        return surfaceSegments;
    }

    return word.furigana.map(item => (item.text === placeholder ? '' : item.text));
}

function splitAnnotatedWord(surfaceSegments: string[], readingSegments: string[]) {
    let prefixCount = 0;

    while (
        prefixCount < surfaceSegments.length &&
        prefixCount < readingSegments.length &&
        isKana(surfaceSegments[prefixCount]) &&
        surfaceSegments[prefixCount] === readingSegments[prefixCount]
    ) {
        prefixCount += 1;
    }

    let suffixCount = 0;

    while (
        suffixCount < surfaceSegments.length - prefixCount &&
        suffixCount < readingSegments.length - prefixCount &&
        isKana(surfaceSegments[surfaceSegments.length - 1 - suffixCount]) &&
        surfaceSegments[surfaceSegments.length - 1 - suffixCount] ===
            readingSegments[readingSegments.length - 1 - suffixCount]
    ) {
        suffixCount += 1;
    }

    const annotatedSurface = surfaceSegments.slice(prefixCount, surfaceSegments.length - suffixCount);
    const annotatedReading = readingSegments.slice(prefixCount, readingSegments.length - suffixCount);

    if (annotatedSurface.length === 0 || annotatedReading.length === 0) {
        return {
            annotatedReading: readingSegments,
            annotatedStartIndex: 0,
            annotatedSurface: surfaceSegments,
            prefixSurface: [] as string[],
            suffixSurface: [] as string[],
            trailingHiddenReadingCount: 0,
        };
    }

    return {
        annotatedReading,
        annotatedStartIndex: prefixCount,
        annotatedSurface,
        prefixSurface: surfaceSegments.slice(0, prefixCount),
        suffixSurface: surfaceSegments.slice(surfaceSegments.length - suffixCount),
        trailingHiddenReadingCount: suffixCount,
    };
}

function getTextWeight(text: string): number {
    const glyphs = [...text];

    if (glyphs.length === 0) {
        return 1;
    }

    return glyphs.length;
}

function distributeWidths(weights: number[], totalWidthEm: number): number[] {
    const safeWeights = weights.length > 0 ? weights : [1];
    const totalWeight = safeWeights.reduce((sum, weight) => sum + weight, 0) || 1;

    return safeWeights.map(weight => (totalWidthEm * weight) / totalWeight);
}

function getWordLayoutMetrics(baseSegments: string[], readingSegments: string[]): LayoutMetrics {
    const safeBaseSegments = baseSegments.length > 0 ? baseSegments : [''];
    const safeReadingSegments = readingSegments.length > 0 ? readingSegments : [''];
    const baseWeights = safeBaseSegments.map(getTextWeight);
    const readingWeights = safeReadingSegments.map(getTextWeight);
    const baseWidthEm = baseWeights.reduce((sum, weight) => sum + weight, 0);
    const readingWidthEm = readingWeights.reduce((sum, weight) => sum + weight, 0) * rubyScale;
    const groupWidthEm = Math.max(baseWidthEm, readingWidthEm, 1);
    const readingIsLongerOrEqual = readingWidthEm >= baseWidthEm;
    const alignedSegmentCounts = safeBaseSegments.length === safeReadingSegments.length;

    return {
        baseCellWidthsEm:
            alignedSegmentCounts || !readingIsLongerOrEqual
                ? distributeWidths(baseWeights, groupWidthEm)
                : Array.from({ length: safeBaseSegments.length }, () => groupWidthEm / safeBaseSegments.length),
        groupWidthEm,
        readingCellWidthsEm:
            alignedSegmentCounts || readingIsLongerOrEqual
                ? distributeWidths(readingWeights, groupWidthEm)
                : Array.from({ length: safeReadingSegments.length }, () => groupWidthEm / safeReadingSegments.length),
    };
}

export function buildWordAnnotationModel(word: Word): WordAnnotationModel {
    const surfaceSegments = getSurfaceSegments(word);
    const kanaAccents = Array.isArray(word.accent) ? word.accent : null;
    const isKanaWord = isKana(word.surface) && kanaAccents !== null;
    const readingSegments = getReadingSegments(word, surfaceSegments);

    if (isKanaWord) {
        const { baseCellWidthsEm, groupWidthEm, readingCellWidthsEm } = getWordLayoutMetrics(
            surfaceSegments,
            surfaceSegments,
        );

        return {
            annotatedReading: surfaceSegments,
            annotatedStartIndex: 0,
            annotatedSurface: surfaceSegments,
            baseCellWidthsEm,
            groupWidthEm,
            isKanaWord,
            kanaAccents,
            prefixSurface: [],
            readingCellWidthsEm,
            surfaceSegments,
            suffixSurface: [],
            trailingHiddenReadingCount: 0,
        };
    }

    const splitWord = splitAnnotatedWord(surfaceSegments, readingSegments);
    const { baseCellWidthsEm, groupWidthEm, readingCellWidthsEm } = getWordLayoutMetrics(
        splitWord.annotatedSurface,
        splitWord.annotatedReading,
    );

    return {
        ...splitWord,
        baseCellWidthsEm,
        groupWidthEm,
        isKanaWord,
        kanaAccents: null,
        readingCellWidthsEm,
        surfaceSegments,
    };
}
