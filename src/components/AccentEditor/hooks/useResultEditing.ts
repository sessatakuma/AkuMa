import { useCallback, useEffect, useRef } from 'react';

import { useI18n } from '../../../i18n';
import { placeholder } from '../constant/placeholder';
import { isKanaReading, normalizeKanaText, splitKanaSyllables } from '../core/kana/kanaUtils';
import { cloneWords } from '../core/word/accent';
import { AccentValue, type AccentValueType, type Word } from '../core/word/accentTypes';

type FocusPlacement = 'start' | 'end';
type FocusDirection = 'previous' | 'next';

interface PendingFocusTarget {
    wordIndex: number;
    textIndex: number;
    placement: FocusPlacement;
}

type EditableKanaKey = `${number}:${number}`;

interface UseResultEditingOptions {
    showFeedback: (message: string, type: 'success' | 'warning') => void;
    updateWords: (updater: Word[] | ((current: Word[]) => Word[])) => void;
    words: Word[];
}

function syncWordAccentWithFurigana(word: Word): void {
    word.accent = word.furigana.map(item => item.accent);
}

export function useResultEditing({
    showFeedback,
    updateWords,
    words,
}: UseResultEditingOptions) {
    const { t } = useI18n();
    const pendingFocusRef = useRef<PendingFocusTarget | null>(null);
    const editableKanaRefs = useRef(new Map<EditableKanaKey, HTMLSpanElement>());

    const getEditableKanaKey = (wordIndex: number, textIndex: number): EditableKanaKey =>
        `${wordIndex}:${textIndex}`;

    const focusEditableKana = useCallback(
        (wordIndex: number, textIndex: number, placement: FocusPlacement): void => {
            pendingFocusRef.current = { wordIndex, textIndex, placement };
        },
        [],
    );

    const registerEditableKana = useCallback(
        (wordIndex: number, textIndex: number, node: HTMLSpanElement | null): void => {
            const key = getEditableKanaKey(wordIndex, textIndex);
            if (node) {
                editableKanaRefs.current.set(key, node);
                return;
            }

            editableKanaRefs.current.delete(key);
        },
        [],
    );

    const setCaretPosition = useCallback((element: HTMLElement, placement: FocusPlacement): void => {
        const selection = window.getSelection();
        if (!selection) return;

        const range = document.createRange();
        range.selectNodeContents(element);
        range.collapse(placement === 'start');
        selection.removeAllRanges();
        selection.addRange(range);
        element.focus();
    }, []);

    const moveFocusAcrossFurigana = useCallback(
        (wordIndex: number, textIndex: number, direction: FocusDirection): boolean => {
            const currentKey = getEditableKanaKey(wordIndex, textIndex);
            const registeredTargets = Array.from(editableKanaRefs.current.entries())
                .map(([key, node]) => {
                    const [targetWordIndex, targetTextIndex] = key.split(':').map(Number);
                    return { key, node, targetTextIndex, targetWordIndex };
                })
                .sort((left, right) =>
                    left.targetWordIndex === right.targetWordIndex
                        ? left.targetTextIndex - right.targetTextIndex
                        : left.targetWordIndex - right.targetWordIndex,
                );
            const currentIndex = registeredTargets.findIndex(target => target.key === currentKey);
            const targetIndex = currentIndex + (direction === 'next' ? 1 : -1);
            const target = registeredTargets[targetIndex];

            if (target) {
                setCaretPosition(target.node, direction === 'next' ? 'end' : 'start');
                return true;
            }

            return false;
        },
        [setCaretPosition],
    );

    const updateKana = useCallback(
        (wordIndex: number, textIndex: number, newAccent: AccentValueType): void => {
            updateWords(currentWords => {
                const nextWords = cloneWords(currentWords);
                const word = nextWords[wordIndex];
                if (word && Array.isArray(word.accent)) {
                    word.accent[textIndex] = newAccent;

                    if (word.furigana[textIndex]) {
                        word.furigana[textIndex].accent = newAccent;
                    }
                }
                return nextWords;
            });
        },
        [updateWords],
    );

    const updateFurigana = useCallback(
        (wordIndex: number, textIndex: number, newFurigana: string, newAccent: AccentValueType): void => {
            const trimmed = normalizeKanaText(newFurigana.trim());

            if (trimmed !== '' && !isKanaReading(trimmed)) {
                showFeedback(t.furiganaInputWarning, 'warning');
                return;
            }

            updateWords(currentWords => {
                const nextWords = cloneWords(currentWords);
                const word = nextWords[wordIndex];
                if (!word || !word.furigana[textIndex]) {
                    return currentWords;
                }

                if (newFurigana === placeholder || trimmed === '') {
                    if (word.furigana.length === 1) {
                        word.furigana[textIndex].text = placeholder;
                        word.furigana[textIndex].accent = AccentValue.None;
                    } else {
                        word.furigana.splice(textIndex, 1);
                    }

                    syncWordAccentWithFurigana(word);
                    return nextWords;
                }

                const syllables = splitKanaSyllables(trimmed);
                if (syllables.length === 1) {
                    word.furigana[textIndex].text = trimmed;
                    word.furigana[textIndex].accent = newAccent;
                    syncWordAccentWithFurigana(word);
                    return nextWords;
                }

                word.furigana.splice(
                    textIndex,
                    1,
                    ...syllables.map((text, index) => ({
                        text,
                        accent: index === 0 ? newAccent : AccentValue.None,
                    })),
                );
                syncWordAccentWithFurigana(word);
                return nextWords;
            });
        },
        [showFeedback, t.furiganaInputWarning, updateWords],
    );

    const deleteForwardAcrossFurigana = useCallback(
        (wordIndex: number, textIndex: number, currentText: string): boolean => {
            let handled = false;

            updateWords(currentWords => {
                const nextWords = cloneWords(currentWords);
                const word = nextWords[wordIndex];
                const currentItem = word?.furigana[textIndex];
                if (!word || !currentItem) {
                    return currentWords;
                }

                const isCurrentEmpty = currentText.length === 0;
                const currentUnits = splitKanaSyllables(currentItem.text.replaceAll(placeholder, '').trim());

                if (isCurrentEmpty && word.furigana.length <= 1) {
                    return currentWords;
                }

                handled = true;

                if (isCurrentEmpty || currentUnits.length <= 1) {
                    if (word.furigana.length <= 1) {
                        currentItem.text = placeholder;
                        currentItem.accent = AccentValue.None;
                    } else {
                        word.furigana.splice(textIndex, 1);
                    }

                    const nextFocusIndex = Math.min(textIndex, word.furigana.length - 1);
                    if (word.furigana[nextFocusIndex]) {
                        focusEditableKana(wordIndex, nextFocusIndex, 'start');
                    }

                    syncWordAccentWithFurigana(word);
                    return nextWords;
                }

                currentItem.text = currentUnits.slice(1).join('');
                syncWordAccentWithFurigana(word);
                focusEditableKana(wordIndex, textIndex, 'start');
                return nextWords;
            });

            return handled;
        },
        [focusEditableKana, updateWords],
    );

    const deleteBackwardAcrossFurigana = useCallback(
        (wordIndex: number, textIndex: number, currentText: string): boolean => {
            if (textIndex <= 0) {
                return false;
            }

            let handled = false;

            updateWords(currentWords => {
                const nextWords = cloneWords(currentWords);
                const word = nextWords[wordIndex];
                if (!word || !word.furigana[textIndex - 1] || !word.furigana[textIndex]) {
                    return currentWords;
                }

                const isCurrentEmpty = currentText.length === 0;
                if (isCurrentEmpty && word.furigana.length <= 1) {
                    return currentWords;
                }

                const previousIndex = textIndex - 1;
                const previousItem = word.furigana[previousIndex];
                const previousUnits = splitKanaSyllables(previousItem.text.replaceAll(placeholder, '').trim());
                if (previousUnits.length === 0) {
                    return currentWords;
                }

                handled = true;

                const nextPreviousText = previousUnits.slice(0, -1).join('');
                if (nextPreviousText.length === 0) {
                    if (word.furigana.length - (isCurrentEmpty ? 1 : 0) <= 1) {
                        previousItem.text = placeholder;
                        previousItem.accent = AccentValue.None;
                    } else {
                        word.furigana.splice(previousIndex, 1);
                    }
                } else {
                    previousItem.text = nextPreviousText;
                }

                syncWordAccentWithFurigana(word);

                let focusIndex = textIndex;
                if (isCurrentEmpty) {
                    const currentIndex = word.furigana[previousIndex] === previousItem ? textIndex : textIndex - 1;
                    if (word.furigana[currentIndex]) {
                        word.furigana.splice(currentIndex, 1);
                    }
                    focusIndex = Math.max(0, currentIndex - 1);
                } else if (!word.furigana[previousIndex] || word.furigana[previousIndex] !== previousItem) {
                    focusIndex = textIndex - 1;
                }

                const boundedFocusIndex = Math.min(focusIndex, word.furigana.length - 1);
                if (word.furigana[boundedFocusIndex]) {
                    focusEditableKana(wordIndex, boundedFocusIndex, isCurrentEmpty ? 'end' : 'start');
                }

                return nextWords;
            });

            return handled;
        },
        [focusEditableKana, updateWords],
    );

    useEffect(() => {
        const pendingFocus = pendingFocusRef.current;
        if (!pendingFocus) return;

        pendingFocusRef.current = null;
        window.requestAnimationFrame(() => {
            const target = editableKanaRefs.current.get(
                getEditableKanaKey(pendingFocus.wordIndex, pendingFocus.textIndex),
            );
            if (target) {
                setCaretPosition(target, pendingFocus.placement);
            }
        });
    }, [setCaretPosition, words]);

    return {
        deleteBackwardAcrossFurigana,
        deleteForwardAcrossFurigana,
        moveFocusAcrossFurigana,
        registerEditableKana,
        updateFurigana,
        updateKana,
    };
}
