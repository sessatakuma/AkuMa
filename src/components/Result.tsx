import { forwardRef, useEffect, useRef, useState } from 'react';

import { useResultEditing } from 'hooks/useResultEditing';

import { type Word } from './accentTypes';
import { exportResultAsImage, preloadImageExport } from './exportImage';
import { buildMarkdownExport } from './exportMarkdown';
import { buildPlainTextExport } from './exportPlainText';
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

type FeedbackType = 'success' | 'warning';

const Result = forwardRef<HTMLDivElement, ResultProps>(
    ({ words, updateWords, isLoading, onEditingChange, statusMessage }, ref) => {
        const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
        const [feedbackType, setFeedbackType] = useState<FeedbackType>('success');
        const [isDarkResult, setIsDarkResult] = useState(false);
        const [isMenuOpen, setIsMenuOpen] = useState(false);
        const [showAccent, setShowAccent] = useState(true);

        const resultRef = useRef<HTMLParagraphElement>(null);
        const isEmpty = !words || words.length === 0;

        const showFeedback = (message: string, type: FeedbackType): void => {
            setFeedbackType(type);
            setCopyFeedback(message);
            window.setTimeout(() => {
                setCopyFeedback(current => (current === message ? null : current));
            }, 2000);
        };

        const { deleteBackwardAcrossFurigana, updateFurigana, updateKana } = useResultEditing({
            resultRef,
            showFeedback,
            updateWords,
            words,
        });

        const downloadMarkdown = (): void => {
            if (isEmpty) return;

            const markdownDocument = buildMarkdownExport(words, showAccent);
            const blob = new Blob([markdownDocument], { type: 'text/markdown;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.download = 'accented-text.md';
            link.href = url;
            link.click();
            window.setTimeout(() => URL.revokeObjectURL(url), 0);
            showFeedback('Markdownを書き出しました！', 'success');
        };

        const downloadImage = async (): Promise<void> => {
            if (resultRef.current === null || isEmpty) return;

            try {
                await exportResultAsImage(resultRef.current, isDarkResult);
            } catch (error) {
                console.error('画像の生成に失敗しました', error);
            }
        };

        const copyPlainText = (): void => {
            if (isEmpty) return;

            navigator.clipboard
                .writeText(buildPlainTextExport(words, showAccent))
                .then(() => showFeedback('コピーしました！', 'success'))
                .catch(err => {
                    console.error('コピー失敗', err);
                    showFeedback('コピーに失敗しました', 'warning');
                });
        };

        useEffect(() => {
            if (!isEmpty) {
                preloadImageExport();
            }
        }, [isEmpty]);

        useEffect(() => {
            if (!isMenuOpen) return;
            const handleClickOutside = (event: globalThis.MouseEvent): void => {
                const target = event.target as HTMLElement;
                if (!target.closest('.save-menu-container')) {
                    setIsMenuOpen(false);
                }
            };
            const handleKeyDown = (event: KeyboardEvent): void => {
                if (event.key === 'Escape') {
                    setIsMenuOpen(false);
                }
            };
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleKeyDown);
            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
                document.removeEventListener('keydown', handleKeyDown);
            };
        }, [isMenuOpen]);

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
