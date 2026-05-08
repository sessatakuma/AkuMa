import { useState, useRef, useEffect, useCallback } from 'react';

import Input from 'components/Input';
import Nav from 'components/Nav';
import Result from 'components/Result';
import { cloneWords } from 'utilities/accent';
import { fetchFuriganaFromAPI } from 'utilities/callAPI';
import isKana from 'utilities/isKana';
import { splitKanaSyllables } from 'utilities/kanaUtils';
import { AccentValue, type Word } from 'utilities/types';
import useDebounce from 'utilities/useDebounce';

import 'components/Main.css';
import 'utilities/accentMarker.css';

export default function Main() {
    const [paragraph, setParagraph] = useState('');
    const [words, setWords] = useState<Word[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [pastWords, setPastWords] = useState<Word[][]>([]);
    const [futureWords, setFutureWords] = useState<Word[][]>([]);
    const [isEditing, setIsEditing] = useState(false);

    const debouncedParagraph = useDebounce(paragraph, 800);
    const resultRef = useRef<HTMLDivElement>(null);
    const wordsRef = useRef(words);
    const lastAnalyzedParagraphRef = useRef<string | null>(null);

    useEffect(() => {
        wordsRef.current = words;
    }, [words]);

    const replaceWords = useCallback((nextWords: Word[]): void => {
        setWords(nextWords);
        setPastWords([]);
        setFutureWords([]);
    }, []);

    const updateWords = useCallback((updater: Word[] | ((current: Word[]) => Word[])): void => {
        setWords(current => {
            const nextWords = typeof updater === 'function' ? updater(current) : updater;
            const currentSerialized = JSON.stringify(current);
            const nextSerialized = JSON.stringify(nextWords);

            if (currentSerialized === nextSerialized) {
                return current;
            }

            setPastWords(previous => [...previous.slice(-49), cloneWords(current)]);
            setFutureWords([]);
            return nextWords;
        });
    }, []);

    const undoWords = useCallback((): void => {
        setPastWords(currentPast => {
            const previousWords = currentPast.at(-1);
            if (!previousWords) {
                return currentPast;
            }

            setFutureWords(currentFuture =>
                [cloneWords(wordsRef.current), ...currentFuture].slice(0, 50),
            );
            setWords(cloneWords(previousWords));
            return currentPast.slice(0, -1);
        });
    }, []);

    const redoWords = useCallback((): void => {
        setFutureWords(currentFuture => {
            const nextWords = currentFuture[0];
            if (!nextWords) {
                return currentFuture;
            }

            setPastWords(currentPast => [...currentPast.slice(-49), cloneWords(wordsRef.current)]);
            setWords(cloneWords(nextWords));
            return currentFuture.slice(1);
        });
    }, []);

    const handleRun = useCallback(
        async (text: string): Promise<void> => {
            if (!text || text.trim() === '') {
                replaceWords([]);
                return;
            }

            setIsLoading(true);

            const result = await fetchFuriganaFromAPI(text);

            if (result.length > 0) {
                replaceWords(
                    result.map(word => {
                        const kanaWord = isKana(word.surface);
                        return {
                            surface: word.surface,
                            furigana: kanaWord
                                ? []
                                : word.accent.length > 0
                                  ? [...word.accent].map(a => ({
                                        text: a.furigana,
                                        accent: a.accent_marking_type as (typeof AccentValue)[keyof typeof AccentValue],
                                    }))
                                  : [{ text: '', accent: AccentValue.None }],
                            accent: kanaWord
                                ? [...word.accent].map(
                                      a =>
                                          a.accent_marking_type as (typeof AccentValue)[keyof typeof AccentValue],
                                  )
                                : AccentValue.None,
                        };
                    }),
                );
            } else {
                alert('サーバーからの応答がありませんでした。');
                const segmenter = new Intl.Segmenter('ja', { granularity: 'word' });
                replaceWords(
                    [...segmenter.segment(text)].map(s => ({
                        surface: s.segment,
                        furigana: isKana(s.segment) ? [] : [{ text: '', accent: AccentValue.None }],
                        accent: isKana(s.segment)
                            ? splitKanaSyllables(s.segment).map(() => AccentValue.None)
                            : AccentValue.None,
                    })),
                );
            }

            setIsLoading(false);
        },
        [replaceWords],
    );

    useEffect(() => {
        if (isEditing) return;
        if (lastAnalyzedParagraphRef.current === debouncedParagraph) return;

        lastAnalyzedParagraphRef.current = debouncedParagraph;
        handleRun(debouncedParagraph);
    }, [debouncedParagraph, handleRun, isEditing]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent): void => {
            const modifier = event.metaKey || event.ctrlKey;
            if (!modifier) return;

            const key = event.key.toLowerCase();
            if (key === 'z' && !event.shiftKey) {
                event.preventDefault();
                undoWords();
            }

            if (key === 'y' || (key === 'z' && event.shiftKey)) {
                event.preventDefault();
                redoWords();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [redoWords, undoWords]);

    return (
        <div className='app-container'>
            <Nav />

            <main className='main-content'>
                <div className='two-col-layout'>
                    <section className='input-panel'>
                        <Input paragraph={paragraph} setParagraph={setParagraph} />
                    </section>

                    <section className='result-panel'>
                        <Result
                            words={words}
                            updateWords={updateWords}
                            ref={resultRef}
                            isLoading={isLoading}
                            canUndo={pastWords.length > 0}
                            canRedo={futureWords.length > 0}
                            onUndo={undoWords}
                            onRedo={redoWords}
                            onEditingChange={setIsEditing}
                        />
                    </section>
                </div>
            </main>
        </div>
    );
}
