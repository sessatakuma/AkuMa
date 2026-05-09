import { useEffect, useRef, useState } from 'react';

import { type Word } from '../core/word/accentTypes';
import { useResultControls } from '../hooks/useResultControls';
import { useResultEditing } from '../hooks/useResultEditing';

import ResultActions from './ResultActions';
import ResultContent from './ResultContent';

import './Result.css';

interface ResultProps {
    isPresenting: boolean;
    words: Word[];
    paragraph: string;
    revealedAccentUnits: number;
    revealedFuriganaUnits: number;
    revealedLoadingCharacters: number;
    updateWords: (updater: Word[] | ((current: Word[]) => Word[])) => void;
    isLoading: boolean;
    onEditingChange: (isEditing: boolean) => void;
    statusMessage: string;
}

export default function Result({
    isPresenting,
    paragraph,
    revealedAccentUnits,
    revealedFuriganaUnits,
    revealedLoadingCharacters,
    words,
    updateWords,
    isLoading,
    onEditingChange,
    statusMessage,
}: ResultProps) {
    const [overlayPhase, setOverlayPhase] = useState<'hidden' | 'loading' | 'done'>('hidden');
    const doneTimeoutRef = useRef<number | null>(null);
    const previousBusyRef = useRef(false);
    const resultRef = useRef<HTMLParagraphElement>(null);
    const {
        copyFeedback,
        copyPlainText,
        downloadImage,
        downloadMarkdown,
        feedbackType,
        isDarkResult,
        isEmpty,
        isMenuOpen,
        setIsDarkResult,
        setIsMenuOpen,
        setShowAccent,
        showAccent,
        showFeedback,
    } = useResultControls({
        resultRef,
        words,
    });

    const {
        deleteBackwardAcrossFurigana,
        deleteForwardAcrossFurigana,
        moveFocusAcrossFurigana,
        registerEditableKana,
        updateFurigana,
        updateKana,
    } =
        useResultEditing({
            showFeedback,
            updateWords,
            words,
        });
    const isBusy = isLoading || isPresenting;
    const hasOverlayTarget = paragraph.trim().length > 0 || words.length > 0;

    useEffect(() => {
        if (doneTimeoutRef.current !== null) {
            window.clearTimeout(doneTimeoutRef.current);
            doneTimeoutRef.current = null;
        }

        if (isBusy && hasOverlayTarget) {
            setOverlayPhase('loading');
            previousBusyRef.current = true;
            return;
        }

        if (!isBusy && previousBusyRef.current && words.length > 0) {
            setOverlayPhase('done');
            previousBusyRef.current = false;
            doneTimeoutRef.current = window.setTimeout(() => {
                setOverlayPhase('hidden');
                doneTimeoutRef.current = null;
            }, 300);
            return;
        }

        previousBusyRef.current = false;
        setOverlayPhase('hidden');
    }, [hasOverlayTarget, isBusy, words.length]);

    useEffect(
        () => () => {
            if (doneTimeoutRef.current !== null) {
                window.clearTimeout(doneTimeoutRef.current);
                doneTimeoutRef.current = null;
            }
        },
        [],
    );

    return (
        <div
            className={`result-container-inner ${isDarkResult ? 'dark-result' : ''} ${
                isEmpty ? 'tone-down' : ''
            }`}
        >
            <p className='visually-hidden' aria-live='polite'>
                {statusMessage}
            </p>
            <div className='result-content'>
                {overlayPhase !== 'hidden' && (
                    <div
                        className={`result-status-overlay result-status-overlay-${overlayPhase}`}
                        aria-hidden='true'
                    >
                        <span className='result-status-label'>
                            {overlayPhase === 'done' ? '分析完了！' : '分析中'}
                        </span>
                        {overlayPhase === 'loading' && (
                            <span className='result-status-dots'>
                                <span className='result-status-dot'></span>
                                <span className='result-status-dot'></span>
                                <span className='result-status-dot'></span>
                            </span>
                        )}
                    </div>
                )}
                <ResultContent
                    deleteBackwardAcrossFurigana={deleteBackwardAcrossFurigana}
                    deleteForwardAcrossFurigana={deleteForwardAcrossFurigana}
                    isLoading={isLoading}
                    isPresenting={isPresenting}
                    moveFocusAcrossFurigana={moveFocusAcrossFurigana}
                    onEditingChange={onEditingChange}
                    paragraph={paragraph}
                    registerEditableKana={registerEditableKana}
                    revealedAccentUnits={revealedAccentUnits}
                    revealedFuriganaUnits={revealedFuriganaUnits}
                    revealedLoadingCharacters={revealedLoadingCharacters}
                    resultRef={resultRef}
                    showAccent={showAccent}
                    updateFurigana={updateFurigana}
                    updateKana={updateKana}
                    words={words}
                />
            </div>

            {!isEmpty && (
                <ResultActions
                    copyFeedback={copyFeedback}
                    copyPlainText={copyPlainText}
                    downloadImage={downloadImage}
                    downloadMarkdown={downloadMarkdown}
                    feedbackType={feedbackType}
                    isDarkResult={isDarkResult}
                    isMenuOpen={isMenuOpen}
                    setIsDarkResult={setIsDarkResult}
                    setIsMenuOpen={setIsMenuOpen}
                    setShowAccent={setShowAccent}
                    showAccent={showAccent}
                />
            )}
        </div>
    );
}
