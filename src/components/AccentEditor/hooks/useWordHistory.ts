import { useCallback, useReducer } from 'react';

import { cloneWords } from '../core/word/accent';

import type { Word } from '../core/word/accentTypes';

const HISTORY_LIMIT = 50;

interface WordHistoryState {
    futureWords: Word[][];
    pastWords: Word[][];
    words: Word[];
}

type WordHistoryAction =
    | {
          type: 'redo';
      }
    | {
          type: 'replace';
          words: Word[];
      }
    | {
          type: 'undo';
      }
    | {
          type: 'update';
          updater: Word[] | ((current: Word[]) => Word[]);
      };

const INITIAL_STATE: WordHistoryState = {
    futureWords: [],
    pastWords: [],
    words: [],
};

function areWordsEqual(left: Word[], right: Word[]): boolean {
    if (left.length !== right.length) return false;

    return left.every((leftWord, wordIndex) => {
        const rightWord = right[wordIndex];
        if (!rightWord || leftWord.surface !== rightWord.surface) {
            return false;
        }

        const leftAccent = Array.isArray(leftWord.accent) ? leftWord.accent : [leftWord.accent];
        const rightAccent = Array.isArray(rightWord.accent) ? rightWord.accent : [rightWord.accent];
        if (
            leftAccent.length !== rightAccent.length ||
            leftAccent.some((accent, accentIndex) => accent !== rightAccent[accentIndex])
        ) {
            return false;
        }

        if (leftWord.furigana.length !== rightWord.furigana.length) {
            return false;
        }

        return leftWord.furigana.every((item, itemIndex) => {
            const rightItem = rightWord.furigana[itemIndex];
            return !!rightItem && item.text === rightItem.text && item.accent === rightItem.accent;
        });
    });
}

function wordHistoryReducer(state: WordHistoryState, action: WordHistoryAction): WordHistoryState {
    switch (action.type) {
        case 'replace':
            return {
                futureWords: [],
                pastWords: [],
                words: action.words,
            };
        case 'update': {
            const nextWords =
                typeof action.updater === 'function' ? action.updater(state.words) : action.updater;
            if (areWordsEqual(state.words, nextWords)) {
                return state;
            }

            return {
                futureWords: [],
                pastWords: [...state.pastWords.slice(-(HISTORY_LIMIT - 1)), cloneWords(state.words)],
                words: nextWords,
            };
        }
        case 'undo': {
            const previousWords = state.pastWords.at(-1);
            if (!previousWords) {
                return state;
            }

            return {
                futureWords: [cloneWords(state.words), ...state.futureWords].slice(0, HISTORY_LIMIT),
                pastWords: state.pastWords.slice(0, -1),
                words: cloneWords(previousWords),
            };
        }
        case 'redo': {
            const nextWords = state.futureWords[0];
            if (!nextWords) {
                return state;
            }

            return {
                futureWords: state.futureWords.slice(1),
                pastWords: [...state.pastWords.slice(-(HISTORY_LIMIT - 1)), cloneWords(state.words)],
                words: cloneWords(nextWords),
            };
        }
    }
}

export function useWordHistory() {
    const [state, dispatch] = useReducer(wordHistoryReducer, INITIAL_STATE);

    const replaceWords = useCallback(
        (nextWords: Word[]): void => {
            dispatch({
                type: 'replace',
                words: nextWords,
            });
        },
        [],
    );

    const updateWords = useCallback(
        (updater: Word[] | ((current: Word[]) => Word[])): void => {
            dispatch({
                type: 'update',
                updater,
            });
        },
        [],
    );

    const undoWords = useCallback((): void => {
        dispatch({
            type: 'undo',
        });
    }, []);

    const redoWords = useCallback((): void => {
        dispatch({
            type: 'redo',
        });
    }, []);

    return {
        canRedo: state.futureWords.length > 0,
        canUndo: state.pastWords.length > 0,
        redoWords,
        replaceWords,
        undoWords,
        updateWords,
        words: state.words,
    };
}
