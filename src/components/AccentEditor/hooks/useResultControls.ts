import { useEffect, useState } from 'react';

import { exportResultAsImage, preloadImageExport } from '../core/export/exportImage';
import { buildMarkdownExport } from '../core/export/exportMarkdown';
import { buildPlainTextExport } from '../core/export/exportPlainText';

import type { Word } from '../core/word/accentTypes';

type FeedbackType = 'success' | 'warning';

interface UseResultControlsOptions {
    resultRef: React.RefObject<HTMLParagraphElement | null>;
    words: Word[];
}

export function useResultControls({ resultRef, words }: UseResultControlsOptions) {
    const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
    const [feedbackType, setFeedbackType] = useState<FeedbackType>('success');
    const [isDarkResult, setIsDarkResult] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [showAccent, setShowAccent] = useState(true);
    const isEmpty = words.length === 0;

    const showFeedback = (message: string, type: FeedbackType): void => {
        setFeedbackType(type);
        setCopyFeedback(message);
        window.setTimeout(() => {
            setCopyFeedback(current => (current === message ? null : current));
        }, 2000);
    };

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
            .catch(error => {
                console.error('コピー失敗', error);
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

    return {
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
    };
}
