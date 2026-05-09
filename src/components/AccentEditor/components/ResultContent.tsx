import { placeholder } from '../constant/placeholder';
import isKana from '../core/kana/isKana';
import { splitKanaSyllables } from '../core/kana/kanaUtils';
import { AccentValue, type AccentValueType, type Word } from '../core/word/accentTypes';

import Kana from './Kana';
import SkeletonLoader from './SkeletonLoader';

function getSurfaceSegments(word: Word): string[] {
    return isKana(word.surface) && Array.isArray(word.accent)
        ? splitKanaSyllables(word.surface)
        : [...word.surface];
}

interface ResultContentProps {
    deleteBackwardAcrossFurigana: (wordIndex: number, textIndex: number, currentText: string) => boolean;
    deleteForwardAcrossFurigana: (wordIndex: number, textIndex: number, currentText: string) => boolean;
    isLoading: boolean;
    moveFocusAcrossFurigana: (wordIndex: number, textIndex: number, direction: 'previous' | 'next') => boolean;
    onEditingChange: (isEditing: boolean) => void;
    paragraph: string;
    registerEditableKana: (wordIndex: number, textIndex: number, node: HTMLSpanElement | null) => void;
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
    deleteBackwardAcrossFurigana,
    deleteForwardAcrossFurigana,
    isLoading,
    moveFocusAcrossFurigana,
    onEditingChange,
    paragraph,
    registerEditableKana,
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

                if (kanaWord && kanaAccents) {
                    return (
                        <span key={`${wordIndex}-${word.surface}`}>
                            {surfaceSegments.map((segment, charIndex) => (
                                <ruby key={`${wordIndex}-${charIndex}`} className='kana-only-ruby'>
                                    <span className='kana-only-base'>{segment}</span>
                                    <rt>
                                        <Kana
                                            text={segment}
                                            ghost
                                            accent={kanaAccents[charIndex] ?? AccentValue.None}
                                            onUpdate={(_ignore, newAccent) =>
                                                updateKana(wordIndex, charIndex, newAccent)
                                            }
                                        />
                                    </rt>
                                </ruby>
                            ))}
                        </span>
                    );
                }

                return (
                    <ruby key={`${wordIndex}-${word.surface}`}>
                        {surfaceSegments.map((segment, charIndex) => (
                            <span key={`${wordIndex}-${charIndex}`}>{segment}</span>
                        ))}
                        <rt>
                            <span className='furigana-group'>
                                {word.furigana.map((char, charIndex) => (
                                    <Kana
                                        key={`${wordIndex}-${charIndex}`}
                                        accent={char.accent}
                                        editable
                                        text={char.text === placeholder ? '' : char.text}
                                        textIndex={charIndex}
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
                                ))}
                            </span>
                        </rt>
                    </ruby>
                );
            })}
        </div>
    );
}
