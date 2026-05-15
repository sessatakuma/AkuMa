import type { CSSProperties } from 'react';

import { placeholder } from '../constant/placeholder';
import isKana from '../core/kana/isKana';
import { splitKanaSyllables } from '../core/kana/kanaUtils';
import { AccentValue, type AccentValueType, type Word } from '../core/word/accentTypes';

import Kana from './Kana';
import SkeletonLoader from './SkeletonLoader';

const rubyScale = 0.6;
const smallKana = new Set(['ゃ', 'ゅ', 'ょ', 'ャ', 'ュ', 'ョ', 'ァ', 'ィ', 'ゥ', 'ェ', 'ォ', 'ヮ', 'ぁ', 'ぃ', 'ぅ', 'ぇ', 'ぉ']);

function getSurfaceSegments(word: Word): string[] {
    return isKana(word.surface) && Array.isArray(word.accent)
        ? splitKanaSyllables(word.surface)
        : [...word.surface];
}

function getTextWeight(text: string): number {
    const glyphs = [...text];

    if (glyphs.length === 0) {
        return 1;
    }

    return glyphs.reduce((sum, glyph) => sum + (smallKana.has(glyph) ? 0.65 : 1), 0);
}

function distributeWidths(weights: number[], totalWidthEm: number): number[] {
    const safeWeights = weights.length > 0 ? weights : [1];
    const totalWeight = safeWeights.reduce((sum, weight) => sum + weight, 0) || 1;

    return safeWeights.map(weight => (totalWidthEm * weight) / totalWeight);
}

function getWordLayoutMetrics(baseSegments: string[], readingSegments: string[]) {
    const safeBaseSegments = baseSegments.length > 0 ? baseSegments : [''];
    const safeReadingSegments = readingSegments.length > 0 ? readingSegments : [''];
    const baseWeights = safeBaseSegments.map(getTextWeight);
    const readingWeights = safeReadingSegments.map(getTextWeight);
    const baseWidthEm = baseWeights.reduce((sum, weight) => sum + weight, 0);
    const readingWidthEm = readingWeights.reduce((sum, weight) => sum + weight, 0) * rubyScale;
    const groupWidthEm = Math.max(baseWidthEm, readingWidthEm, 1);
    const readingIsLonger = readingWidthEm > baseWidthEm;

    return {
        baseCellWidthsEm: readingIsLonger
            ? Array.from({ length: safeBaseSegments.length }, () => groupWidthEm / safeBaseSegments.length)
            : distributeWidths(baseWeights, groupWidthEm),
        groupWidthEm,
        readingCellWidthsEm: readingIsLonger
            ? distributeWidths(readingWeights, groupWidthEm)
            : Array.from({ length: safeReadingSegments.length }, () => groupWidthEm / safeReadingSegments.length),
    };
}

function createWidthStyle(widthEm: number): CSSProperties {
    return { width: `${widthEm}em` };
}

interface ResultContentProps {
    accentPhaseActive: boolean;
    deleteBackwardAcrossFurigana: (wordIndex: number, textIndex: number, currentText: string) => boolean;
    deleteForwardAcrossFurigana: (wordIndex: number, textIndex: number, currentText: string) => boolean;
    isLoading: boolean;
    isPresenting: boolean;
    moveFocusAcrossFurigana: (wordIndex: number, textIndex: number, direction: 'previous' | 'next') => boolean;
    onEditingChange: (isEditing: boolean) => void;
    paragraph: string;
    registerEditableKana: (wordIndex: number, textIndex: number, node: HTMLSpanElement | null) => void;
    revealedAccentUnits: number;
    revealedFuriganaUnits: number;
    revealedLoadingCharacters: number;
    resultRef: React.RefObject<HTMLParagraphElement | null>;
    showAccent: boolean;
    updateFurigana: (
        wordIndex: number,
        textIndex: number,
        newFurigana: string,
        newAccent: AccentValueType,
    ) => void;
    updateKana: (wordIndex: number, textIndex: number, newAccent: AccentValueType) => void;
    words: Word[];
}

export default function ResultContent({
    accentPhaseActive,
    deleteBackwardAcrossFurigana,
    deleteForwardAcrossFurigana,
    isLoading,
    isPresenting,
    moveFocusAcrossFurigana,
    onEditingChange,
    paragraph,
    registerEditableKana,
    revealedAccentUnits,
    revealedFuriganaUnits,
    revealedLoadingCharacters,
    resultRef,
    showAccent,
    updateFurigana,
    updateKana,
    words,
}: ResultContentProps) {
    if (isLoading) {
        return (
            <SkeletonLoader
                paragraph={paragraph}
                revealedCharacterCount={revealedLoadingCharacters}
            />
        );
    }

    if (words.length === 0) {
        return (
            <div className='empty-state' role='status' aria-live='polite'>
                <p>結果</p>
            </div>
        );
    }

    let furiganaRevealIndex = 0;
    let accentRevealIndex = 0;

    return (
        <div
            id='accent-result-output'
            className={`result-area ${showAccent ? '' : 'result-area-hide-accent'}`.trim()}
            ref={resultRef}
            role='region'
            aria-live='polite'
            aria-label='アクセント解析結果'
            lang='ja'
        >
            {words.map((word, wordIndex) => {
                const surfaceSegments = getSurfaceSegments(word);
                const kanaWord = isKana(word.surface);
                const kanaAccents = Array.isArray(word.accent) ? word.accent : null;
                const readingSegments = kanaWord
                    ? surfaceSegments
                    : word.furigana.map(char => (char.text === placeholder ? '' : char.text));
                const { baseCellWidthsEm, groupWidthEm, readingCellWidthsEm } = getWordLayoutMetrics(
                    surfaceSegments,
                    readingSegments,
                );
                const groupStyle = createWidthStyle(groupWidthEm);

                if (kanaWord && kanaAccents) {
                    return (
                        <span
                            key={`${wordIndex}-${word.surface}`}
                            className='word-group word-group-kana'
                            style={groupStyle}
                        >
                            <span className='word-reading-row'>
                                {surfaceSegments.map((segment, charIndex) => {
                                    const isAccentVisible =
                                        accentPhaseActive && accentRevealIndex < revealedAccentUnits;
                                    accentRevealIndex += 1;

                                    return (
                                        <span
                                            key={`${wordIndex}-${charIndex}`}
                                            className='word-reading-cell'
                                            style={createWidthStyle(readingCellWidthsEm[charIndex] / rubyScale)}
                                        >
                                            <Kana
                                                accentPhaseActive={accentPhaseActive}
                                                text={segment}
                                                ghost
                                                accent={kanaAccents[charIndex] ?? AccentValue.None}
                                                accentVisible={isAccentVisible}
                                                interactive={!isPresenting}
                                                onUpdate={(_ignore, newAccent) =>
                                                    updateKana(wordIndex, charIndex, newAccent)
                                                }
                                            />
                                        </span>
                                    );
                                })}
                            </span>
                            <span className='word-base-row' aria-hidden='true'>
                                {surfaceSegments.map((segment, charIndex) => (
                                    <span
                                        key={`${wordIndex}-${charIndex}`}
                                        className='word-base-cell kana-only-base'
                                        style={createWidthStyle(baseCellWidthsEm[charIndex])}
                                    >
                                        {segment}
                                    </span>
                                ))}
                            </span>
                        </span>
                    );
                }

                return (
                    <span
                        key={`${wordIndex}-${word.surface}`}
                        className='word-group'
                        style={groupStyle}
                    >
                        <span className='word-reading-row'>
                            <span className='furigana-group'>
                                {word.furigana.map((char, charIndex) => {
                                    const isFuriganaVisible = furiganaRevealIndex < revealedFuriganaUnits;
                                    const isAccentVisible =
                                        accentPhaseActive && accentRevealIndex < revealedAccentUnits;

                                    furiganaRevealIndex += 1;
                                    accentRevealIndex += 1;

                                    return (
                                        <span
                                            key={`${wordIndex}-${charIndex}`}
                                            className='word-reading-cell'
                                            style={createWidthStyle(readingCellWidthsEm[charIndex] / rubyScale)}
                                        >
                                            <Kana
                                                accent={char.accent}
                                                accentPhaseActive={accentPhaseActive}
                                                accentVisible={isAccentVisible}
                                                editable
                                                interactive={!isPresenting}
                                                text={char.text === placeholder ? '' : char.text}
                                                textIndex={charIndex}
                                                textVisible={isFuriganaVisible}
                                                wordIndex={wordIndex}
                                                onBackspaceAtStart={currentText =>
                                                    deleteBackwardAcrossFurigana(wordIndex, charIndex, currentText)
                                                }
                                                onDeleteAtStart={currentText =>
                                                    deleteForwardAcrossFurigana(wordIndex, charIndex, currentText)
                                                }
                                                onArrowAtEdge={direction =>
                                                    moveFocusAcrossFurigana(wordIndex, charIndex, direction)
                                                }
                                                onUpdate={(newText, newAccent) =>
                                                    updateFurigana(wordIndex, charIndex, newText, newAccent)
                                                }
                                                onFocusChange={onEditingChange}
                                                registerTextRef={node =>
                                                    registerEditableKana(wordIndex, charIndex, node)
                                                }
                                            />
                                        </span>
                                    );
                                })}
                            </span>
                        </span>
                        <span className='word-base-row' aria-hidden='true'>
                            {surfaceSegments.map((segment, charIndex) => (
                                <span
                                    key={`${wordIndex}-${charIndex}`}
                                    className='word-base-cell'
                                    style={createWidthStyle(baseCellWidthsEm[charIndex])}
                                >
                                    {segment}
                                </span>
                            ))}
                        </span>
                    </span>
                );
            })}
        </div>
    );
}
