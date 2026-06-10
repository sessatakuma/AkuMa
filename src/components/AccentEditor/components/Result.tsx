import { useRef } from 'react';

import { type Word } from '../core/word/accentTypes';
import { useResultControls } from '../hooks/useResultControls';
import { useResultEditing } from '../hooks/useResultEditing';

import ResultActions from './ResultActions';
import ResultContent from './ResultContent';

import './Result.css';

interface ResultProps {
    accentPhaseActive: boolean;
    canRestore: boolean;
    isPresenting: boolean;
    words: Word[];
    paragraph: string;
    revealedAccentUnits: number;
    revealedFuriganaUnits: number;
    revealedLoadingCharacters: number;
    updateWords: (updater: Word[] | ((current: Word[]) => Word[])) => void;
    isLoading: boolean;
    onEditingChange: (isEditing: boolean) => void;
    onRequestRestoreAll: () => void;
    onToggleExpanded: () => void;
    isExpanded: boolean;
    statusMessage: string;
}

export default function Result({
    accentPhaseActive,
    canRestore,
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
    onRequestRestoreAll,
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
                    canRestore={canRestore}
                    downloadImage={downloadImage}
                    downloadHtml={downloadHtml}
                    feedbackType={feedbackType}
                    isDarkResult={isDarkResult}
                    isMenuOpen={isMenuOpen}
                    onRequestRestoreAll={onRequestRestoreAll}
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
