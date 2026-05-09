import { useCallback, useRef, useState } from 'react';

import { cloneWords } from './accent';

import type { Word } from 'components/accentTypes';

const HISTORY_LIMIT = 50;

export function useWordHistory() {
    const [words, setWords] = useState<Word[]>([]);
    const [pastWords, setPastWords] = useState<Word[][]>([]);
    const [futureWords, setFutureWords] = useState<Word[][]>([]);
    const wordsRef = useRef(words);

    const syncWordsRef = useCallback((nextWords: Word[]) => {
        wordsRef.current = nextWords;
    }, []);

    const replaceWords = useCallback(
        (nextWords: Word[]): void => {
            syncWordsRef(nextWords);
            setWords(nextWords);
            setPastWords([]);
            setFutureWords([]);
        },
        [syncWordsRef],
    );

    const updateWords = useCallback(
        (updater: Word[] | ((current: Word[]) => Word[])): void => {
            setWords(current => {
                const nextWords = typeof updater === 'function' ? updater(current) : updater;
                if (JSON.stringify(current) === JSON.stringify(nextWords)) {
                    return current;
                }

                syncWordsRef(nextWords);
                setPastWords(previous => [...previous.slice(-(HISTORY_LIMIT - 1)), cloneWords(current)]);
                setFutureWords([]);
                return nextWords;
            });
        },
        [syncWordsRef],
    );

    const undoWords = useCallback((): void => {
        setPastWords(currentPast => {
            const previousWords = currentPast.at(-1);
            if (!previousWords) {
                return currentPast;
            }

            setFutureWords(currentFuture => [cloneWords(wordsRef.current), ...currentFuture].slice(0, HISTORY_LIMIT));
            syncWordsRef(previousWords);
            setWords(cloneWords(previousWords));
            return currentPast.slice(0, -1);
        });
    }, [syncWordsRef]);

    const redoWords = useCallback((): void => {
        setFutureWords(currentFuture => {
            const nextWords = currentFuture[0];
            if (!nextWords) {
                return currentFuture;
            }

            setPastWords(currentPast => [...currentPast.slice(-(HISTORY_LIMIT - 1)), cloneWords(wordsRef.current)]);
            syncWordsRef(nextWords);
            setWords(cloneWords(nextWords));
            return currentFuture.slice(1);
        });
    }, [syncWordsRef]);

    return {
        canRedo: futureWords.length > 0,
        canUndo: pastWords.length > 0,
        redoWords,
        replaceWords,
        undoWords,
        updateWords,
        words,
    };
}
