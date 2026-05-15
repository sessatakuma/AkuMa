import type { CSSProperties } from 'react';

import { AccentValue, type AccentValueType, type Word } from '../core/word/accentTypes';
import { buildWordAnnotationModel, rubyScale } from '../core/word/annotationLayout';

import Kana from './Kana';
import SkeletonLoader from './SkeletonLoader';

function createWidthStyle(widthEm: number): CSSProperties {
    return { width: `${widthEm}em` };
}

function getLineBreakCount(surface: string): number {
    const matches = surface.match(/\r?\n/g);
    return matches ? matches.length : 0;
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
                const lineBreakCount = getLineBreakCount(word.surface);
                if (lineBreakCount > 0) {
                    return (
                        <span key={`${wordIndex}-${word.surface}`} aria-hidden='true'>
                            {Array.from({ length: lineBreakCount }, (_, breakIndex) => (
                                <br key={`${wordIndex}-break-${breakIndex}`} />
                            ))}
                        </span>
                    );
                }

                const model = buildWordAnnotationModel(word);

                if (model.isKanaWord && model.kanaAccents) {
                    const kanaAccents = model.kanaAccents;

                    return (
                        <span
                            key={`${wordIndex}-${word.surface}`}
                            className='word-group word-group-kana'
                            style={createWidthStyle(model.groupWidthEm)}
                        >
                            <span className='word-reading-row'>
                                {model.annotatedReading.map((segment, charIndex) => {
                                    const isAccentVisible =
                                        accentPhaseActive && accentRevealIndex < revealedAccentUnits;
                                    accentRevealIndex += 1;

                                    return (
                                        <span
                                            key={`${wordIndex}-${charIndex}`}
                                            className='word-reading-cell'
                                            style={createWidthStyle(model.readingCellWidthsEm[charIndex] / rubyScale)}
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
                                {model.annotatedSurface.map((segment, charIndex) => (
                                    <span
                                        key={`${wordIndex}-${charIndex}`}
                                        className='word-base-cell kana-only-base'
                                        style={createWidthStyle(model.baseCellWidthsEm[charIndex])}
                                    >
                                        {segment}
                                    </span>
                                ))}
                            </span>
                        </span>
                    );
                }

                furiganaRevealIndex += model.annotatedStartIndex;
                accentRevealIndex += model.annotatedStartIndex;

                const mixedWordContent = (
                    <span key={`${wordIndex}-${word.surface}`} className='word-inline-cluster'>
                        {model.prefixSurface.map((segment, segmentIndex) => (
                            <span key={`prefix-${wordIndex}-${segmentIndex}`} className='word-plain-segment'>
                                {segment}
                            </span>
                        ))}
                        <span className='word-group' style={createWidthStyle(model.groupWidthEm)}>
                            <span className='word-reading-row'>
                                <span className='furigana-group'>
                                    {model.annotatedReading.map((segment, annotatedIndex) => {
                                        const charIndex = model.annotatedStartIndex + annotatedIndex;
                                        const char = word.furigana[charIndex];
                                        const isFuriganaVisible = furiganaRevealIndex < revealedFuriganaUnits;
                                        const isAccentVisible =
                                            accentPhaseActive && accentRevealIndex < revealedAccentUnits;

                                        furiganaRevealIndex += 1;
                                        accentRevealIndex += 1;

                                        return (
                                            <span
                                                key={`${wordIndex}-${charIndex}`}
                                                className='word-reading-cell'
                                                style={createWidthStyle(
                                                    model.readingCellWidthsEm[annotatedIndex] / rubyScale,
                                                )}
                                            >
                                                <Kana
                                                    accent={char.accent}
                                                    accentPhaseActive={accentPhaseActive}
                                                    accentVisible={isAccentVisible}
                                                    editable
                                                    interactive={!isPresenting}
                                                    text={segment}
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
                                {model.annotatedSurface.map((segment, annotatedIndex) => (
                                    <span
                                        key={`${wordIndex}-${annotatedIndex}`}
                                        className='word-base-cell'
                                        style={createWidthStyle(model.baseCellWidthsEm[annotatedIndex])}
                                    >
                                        {segment}
                                    </span>
                                ))}
                            </span>
                        </span>
                        {model.suffixSurface.map((segment, segmentIndex) => (
                            <span key={`suffix-${wordIndex}-${segmentIndex}`} className='word-plain-segment'>
                                {segment}
                            </span>
                        ))}
                    </span>
                );

                furiganaRevealIndex += model.trailingHiddenReadingCount;
                accentRevealIndex += model.trailingHiddenReadingCount;

                return mixedWordContent;
            })}
        </div>
    );
}
