import { useEffect, useRef, useState } from 'react';

import { useAccentAnalysis } from '../hooks/useAccentAnalysis';
import { useHistoryKeyboardShortcuts } from '../hooks/useHistoryKeyboardShortcuts';
import { useResultReveal } from '../hooks/useResultReveal';
import { useSyncedPanelHeight } from '../hooks/useSyncedPanelHeight';
import { useWordHistory } from '../hooks/useWordHistory';

import Input from './Input';
import Result from './Result';

import './AccentEditor.css';

export default function AccentEditor() {
    const [paragraph, setParagraph] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [showCompletionToast, setShowCompletionToast] = useState(false);
    const toastTimeoutRef = useRef<number | null>(null);
    const previousBusyRef = useRef(false);
    const { minHeight, panelRef } = useSyncedPanelHeight<HTMLElement>();
    const {
        redoWords,
        replaceWords,
        undoWords,
        updateWords,
        words,
    } = useWordHistory();
    const { analysisVersion, isLoading, statusMessage } = useAccentAnalysis({
        isEditing,
        paragraph,
        replaceWords,
    });
    const {
        isPresenting,
        revealedAccentUnits,
        revealedFuriganaUnits,
        revealedLoadingCharacters,
    } = useResultReveal({
        analysisVersion,
        isLoading,
        paragraph,
        words,
    });
    const isBusy = isLoading || isPresenting;

    useEffect(() => {
        if (toastTimeoutRef.current !== null) {
            window.clearTimeout(toastTimeoutRef.current);
            toastTimeoutRef.current = null;
        }

        if (isBusy && paragraph.trim().length > 0) {
            setShowCompletionToast(false);
            previousBusyRef.current = true;
            return;
        }

        if (!isBusy && previousBusyRef.current && words.length > 0) {
            setShowCompletionToast(true);
            previousBusyRef.current = false;
            toastTimeoutRef.current = window.setTimeout(() => {
                setShowCompletionToast(false);
                toastTimeoutRef.current = null;
            }, 900);
            return;
        }

        previousBusyRef.current = false;
        setShowCompletionToast(false);
    }, [isBusy, paragraph, words.length]);

    useEffect(
        () => () => {
            if (toastTimeoutRef.current !== null) {
                window.clearTimeout(toastTimeoutRef.current);
                toastTimeoutRef.current = null;
            }
        },
        [],
    );

    useHistoryKeyboardShortcuts({
        onRedo: redoWords,
        onUndo: undoWords,
    });

    return (
        <main id='main-content' className='main-content'>
            <h1 className='visually-hidden'>日本語アクセントマーカー</h1>
            <p className='visually-hidden' aria-live='polite'>
                {statusMessage}
            </p>
            <div className='two-col-layout' aria-label='入力と解析結果'>
                <section className='input-panel' aria-label='入力' ref={panelRef}>
                    <Input paragraph={paragraph} setParagraph={setParagraph} isLoading={isLoading} />
                </section>

                <div className='result-panel-stack' style={{ minHeight: `${minHeight}px` }}>
                    <section className='result-panel' aria-label='結果' aria-busy={isBusy}>
                        <Result
                            isPresenting={isPresenting}
                            paragraph={paragraph}
                            revealedAccentUnits={revealedAccentUnits}
                            revealedFuriganaUnits={revealedFuriganaUnits}
                            revealedLoadingCharacters={revealedLoadingCharacters}
                            words={words}
                            updateWords={updateWords}
                            isLoading={isLoading}
                            onEditingChange={setIsEditing}
                            statusMessage={statusMessage}
                        />
                    </section>
                    {words.length > 0 && (
                        <p className='result-panel-hint' aria-hidden='true'>
                            ふりがな・アクセントをクリックして編集
                        </p>
                    )}
                    {showCompletionToast && (
                        <p className='result-panel-toast' aria-hidden='true'>
                            分析完了！
                        </p>
                    )}
                </div>
            </div>
        </main>
    );
}
