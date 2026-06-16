import type { CSSProperties } from 'react';

import { useI18n } from '../../../i18n';
import { AccentValue, type AccentValueType, type Word } from '../core/word/accentTypes';
import { buildWordAnnotationModel, getLineBreakCount, rubyScale } from '../core/word/annotationLayout';

import Kana from './Kana';
import SkeletonLoader from './SkeletonLoader';

function createWidthStyle(widthEm: number): CSSProperties {
    return { width: `${widthEm}em` };
}

function renderKanaSegment(
    key: string,
    wordIndex: number,
    textIndex: number,
    segment: string,
    accent: AccentValueType,
    accentPhaseActive: boolean,
    accentVisible: boolean,
    isPresenting: boolean,
    showAccent: boolean,
    moveFocusAcrossFurigana: (wordIndex: number, textIndex: number, direction: 'previous' | 'next') => boolean,
    registerAccentControl: (wordIndex: number, textIndex: number, node: HTMLButtonElement | null) => void,
    onUpdate: (_ignore: string, newAccent: AccentValueType) => void,
) {
    return (
        <span
            key={key}
            className='word-inline-cluster word-group-kana'
            style={createWidthStyle(Math.max([...segment].length, 1))}
        >
            <span className='word-reading-cell' style={createWidthStyle(Math.max([...segment].length, 1))}>
                <Kana
                    accent={accent}
                    accentPhaseActive={accentPhaseActive}
                    accentVisible={showAccent && accentVisible}
                    interactive={!isPresenting}
                    text={segment}
                    textIndex={textIndex}
                    textVisible
                    wordIndex={wordIndex}
                    onAccentArrowAtEdge={direction =>
                        moveFocusAcrossFurigana(wordIndex, textIndex, direction)
                    }
                    onUpdate={onUpdate}
                    registerAccentRef={node =>
                        registerAccentControl(wordIndex, textIndex, node)
                    }
                />
            </span>
        </span>
    );
}

interface ResultContentProps {
    accentPhaseActive: boolean;
    deleteBackwardAcrossFurigana: (wordIndex: number, textIndex: number, currentText: string) => boolean;
    deleteForwardAcrossFurigana: (wordIndex: number, textIndex: number, currentText: string) => boolean;
    focusAccentControl: (wordIndex: number, textIndex: number) => boolean;
    isLoading: boolean;
    isPresenting: boolean;
    moveFocusAcrossEditableKana: (wordIndex: number, textIndex: number, direction: 'previous' | 'next') => boolean;
    moveFocusAcrossFurigana: (wordIndex: number, textIndex: number, direction: 'previous' | 'next') => boolean;
    onEditingChange: (isEditing: boolean) => void;
    paragraph: string;
    registerAccentControl: (wordIndex: number, textIndex: number, node: HTMLButtonElement | null) => void;
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
    focusAccentControl,
    isLoading,
    isPresenting,
    moveFocusAcrossEditableKana,
    moveFocusAcrossFurigana,
    onEditingChange,
    paragraph,
    registerAccentControl,
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
    const { lang, t } = useI18n();

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
                <p>{t.result}</p>
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
            aria-label={t.accentResultLabel}
            lang={lang}
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
                            className='word-inline-cluster word-group-kana'
                            style={createWidthStyle(model.groupWidthEm)}
                        >
                            {model.annotatedReading.map((segment, charIndex) => {
                                const hasApiAccent = charIndex < kanaAccents.length;
                                const isAccentVisible =
                                    accentPhaseActive &&
                                    hasApiAccent &&
                                    accentRevealIndex < revealedAccentUnits;
                                if (hasApiAccent) {
                                    accentRevealIndex += 1;
                                }

                                return (
                                    <span
                                        key={`${wordIndex}-${charIndex}`}
                                        className='word-reading-cell'
                                        style={createWidthStyle(model.baseCellWidthsEm[charIndex])}
                                    >
                                        <Kana
                                            accentPhaseActive={accentPhaseActive}
                                            text={segment}
                                            textVisible
                                            accent={kanaAccents[charIndex] ?? AccentValue.None}
                                            accentVisible={isAccentVisible}
                                            interactive={!isPresenting}
                                            textIndex={charIndex}
                                            wordIndex={wordIndex}
                                            onAccentArrowAtEdge={direction =>
                                                moveFocusAcrossFurigana(wordIndex, charIndex, direction)
                                            }
                                            onUpdate={(_ignore, newAccent) =>
                                                updateKana(wordIndex, charIndex, newAccent)
                                            }
                                            registerAccentRef={node =>
                                                registerAccentControl(wordIndex, charIndex, node)
                                            }
                                        />
                                    </span>
                                );
                            })}
                        </span>
                    );
                }

                const accentLength = Array.isArray(word.accent) ? word.accent.length : 0;
                furiganaRevealIndex += model.annotatedStartIndex;

                const mixedWordContent = (
                    <span key={`${wordIndex}-${word.surface}`} className='word-inline-cluster'>
                        {model.prefixSurface.map((segment, segmentIndex) => {
                            const charIndex = segmentIndex;
                            const accent =
                                (Array.isArray(word.accent) ? word.accent[charIndex] : undefined) ??
                                word.furigana[charIndex]?.accent ??
                                AccentValue.None;
                            const hasApiAccent = charIndex < accentLength;
                            const isAccentVisible =
                                accentPhaseActive &&
                                hasApiAccent &&
                                accentRevealIndex < revealedAccentUnits;
                            if (hasApiAccent) {
                                accentRevealIndex += 1;
                            }

                            return renderKanaSegment(
                                `prefix-${wordIndex}-${segmentIndex}`,
                                wordIndex,
                                charIndex,
                                segment,
                                accent,
                                accentPhaseActive,
                                isAccentVisible,
                                isPresenting,
                                showAccent,
                                moveFocusAcrossFurigana,
                                registerAccentControl,
                                (_ignore, newAccent) => updateKana(wordIndex, charIndex, newAccent),
                            );
                        })}
                        <span className='word-stack word-stack-annotated' style={createWidthStyle(model.groupWidthEm)}>
                            <span className='word-reading-row'>
                                <span className='furigana-group'>
                                    {model.annotatedReading.map((segment, annotatedIndex) => {
                                        const charIndex = model.annotatedStartIndex + annotatedIndex;
                                        const char = word.furigana[charIndex];
                                        const hasApiAccent = charIndex < accentLength;
                                        const isFuriganaVisible = furiganaRevealIndex < revealedFuriganaUnits;
                                        const isAccentVisible =
                                            accentPhaseActive &&
                                            hasApiAccent &&
                                            accentRevealIndex < revealedAccentUnits;

                                        furiganaRevealIndex += 1;
                                        if (hasApiAccent) {
                                            accentRevealIndex += 1;
                                        }

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
                                                    onAccentArrowAtEdge={direction =>
                                                        moveFocusAcrossFurigana(wordIndex, charIndex, direction)
                                                    }
                                                    onBackspaceAtStart={currentText =>
                                                        deleteBackwardAcrossFurigana(wordIndex, charIndex, currentText)
                                                    }
                                                    onDeleteAtStart={currentText =>
                                                        deleteForwardAcrossFurigana(wordIndex, charIndex, currentText)
                                                    }
                                                    onArrowAtEdge={direction =>
                                                        moveFocusAcrossEditableKana(wordIndex, charIndex, direction)
                                                    }
                                                    onMoveToAccentRow={() =>
                                                        focusAccentControl(wordIndex, charIndex)
                                                    }
                                                    onUpdate={(newText, newAccent) =>
                                                        updateFurigana(wordIndex, charIndex, newText, newAccent)
                                                    }
                                                    onFocusChange={onEditingChange}
                                                    registerAccentRef={node =>
                                                        registerAccentControl(wordIndex, charIndex, node)
                                                    }
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
                        {model.suffixSurface.map((segment, segmentIndex) => {
                            const charIndex =
                                model.annotatedStartIndex +
                                model.annotatedReading.length +
                                segmentIndex;
                            const accent =
                                (Array.isArray(word.accent) ? word.accent[charIndex] : undefined) ??
                                word.furigana[charIndex]?.accent ??
                                AccentValue.None;
                            const hasApiAccent = charIndex < accentLength;
                            const isAccentVisible =
                                accentPhaseActive &&
                                hasApiAccent &&
                                accentRevealIndex < revealedAccentUnits;
                            if (hasApiAccent) {
                                accentRevealIndex += 1;
                            }

                            return renderKanaSegment(
                                `suffix-${wordIndex}-${segmentIndex}`,
                                wordIndex,
                                charIndex,
                                segment,
                                accent,
                                accentPhaseActive,
                                isAccentVisible,
                                isPresenting,
                                showAccent,
                                moveFocusAcrossFurigana,
                                registerAccentControl,
                                (_ignore, newAccent) => updateKana(wordIndex, charIndex, newAccent),
                            );
                        })}
                    </span>
                );

                furiganaRevealIndex += model.trailingHiddenReadingCount;

                return mixedWordContent;
            })}
        </div>
    );
}
