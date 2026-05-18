import { useRef } from 'react';

import { type Word } from '../core/word/accentTypes';
import { useResultControls } from '../hooks/useResultControls';
import { useResultEditing } from '../hooks/useResultEditing';

import ResultActions from './ResultActions';
import ResultContent from './ResultContent';

import './Result.css';

interface ResultProps {
    accentPhaseActive: boolean;
    isPresenting: boolean;
    words: Word[];
    paragraph: string;
    revealedAccentUnits: number;
    revealedFuriganaUnits: number;
    revealedLoadingCharacters: number;
    updateWords: (updater: Word[] | ((current: Word[]) => Word[])) => void;
    isLoading: boolean;
    onEditingChange: (isEditing: boolean) => void;
    onToggleExpanded: () => void;
    isExpanded: boolean;
    statusMessage: string;
}

export default function Result({
    accentPhaseActive,
    isPresenting,
    paragraph,
    revealedAccentUnits,
    revealedFuriganaUnits,
    revealedLoadingCharacters,
    words,
    updateWords,
    isLoading,
    isExpanded,
    onEditingChange,
    onToggleExpanded,
    statusMessage,
}: ResultProps) {
    const resultRef = useRef<HTMLParagraphElement>(null);
    const {
        copyFeedback,
        copyPlainText,
        downloadImage,
        downloadHtml,
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
    const showStatusOverlay = isLoading || isPresenting;

    return (
        <div
            className={`result-container-inner ${isDarkResult ? 'dark-result' : ''} ${
                isEmpty ? 'tone-down' : ''
            }`}
        >
            <p className='visually-hidden' aria-live='polite'>
                {statusMessage}
            </p>
            {showStatusOverlay && (
                <div className='result-status-overlay' aria-hidden='true'>
                    <div className='result-status-overlay-copy'>
                        <span className='result-status-overlay-label'>分析中</span>
                        <span className='result-status-overlay-dots'>
                            <span className='result-status-overlay-dot'>.</span>
                            <span className='result-status-overlay-dot'>.</span>
                            <span className='result-status-overlay-dot'>.</span>
                        </span>
                    </div>
                </div>
            )}
            <div className='result-content'>
                <ResultContent
                    accentPhaseActive={accentPhaseActive}
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

            {!isEmpty && !isLoading && !isPresenting && (
                <ResultActions
                    copyFeedback={copyFeedback}
                    copyPlainText={copyPlainText}
                    downloadImage={downloadImage}
                    downloadHtml={downloadHtml}
                    feedbackType={feedbackType}
                    isDarkResult={isDarkResult}
                    isMenuOpen={isMenuOpen}
                    setIsDarkResult={setIsDarkResult}
                    setIsMenuOpen={setIsMenuOpen}
                    setShowAccent={setShowAccent}
                    showAccent={showAccent}
                    isExpanded={isExpanded}
                    onToggleExpanded={onToggleExpanded}
                />
            )}
        </div>
    );
}
