import { forwardRef, useRef } from 'react';

import { type Word } from '../core/word/accentTypes';
import { useResultControls } from '../hooks/useResultControls';
import { useResultEditing } from '../hooks/useResultEditing';

import ResultActions from './ResultActions';
import ResultContent from './ResultContent';

import './Result.css';

interface ResultProps {
    words: Word[];
    updateWords: (updater: Word[] | ((current: Word[]) => Word[])) => void;
    isLoading: boolean;
    canUndo: boolean;
    canRedo: boolean;
    onUndo: () => void;
    onRedo: () => void;
    onEditingChange: (isEditing: boolean) => void;
    statusMessage: string;
}
const Result = forwardRef<HTMLDivElement, ResultProps>(
    ({ words, updateWords, isLoading, onEditingChange, statusMessage }, ref) => {
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

        const { deleteBackwardAcrossFurigana, registerEditableKana, updateFurigana, updateKana } =
            useResultEditing({
            resultRef,
            showFeedback,
            updateWords,
            words,
        });

        return (
            <div
                className={`result-container-inner ${isDarkResult ? 'dark-result' : ''} ${
                    isEmpty ? 'tone-down' : ''
                }`}
                ref={ref}
            >
                <p className='visually-hidden' aria-live='polite'>
                    {statusMessage}
                </p>
                <div className='result-content'>
                    <ResultContent
                        deleteBackwardAcrossFurigana={deleteBackwardAcrossFurigana}
                        isLoading={isLoading}
                        onEditingChange={onEditingChange}
                        registerEditableKana={registerEditableKana}
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
    },
);

Result.displayName = 'Result';

export default Result;
