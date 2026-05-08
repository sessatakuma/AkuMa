import { useCallback, useEffect, useRef, useState } from 'react';

import useDebounce from 'utilities/useDebounce';

import { mapApiResultToWords, mapFallbackTextToWords } from '../domain/mappers';
import { fetchMarkAccent } from '../services/markAccentClient';

import type { Word } from '../domain/types';

interface UseAccentAnalysisOptions {
    isEditing: boolean;
    paragraph: string;
    replaceWords: (words: Word[]) => void;
}

export function useAccentAnalysis({
    isEditing,
    paragraph,
    replaceWords,
}: UseAccentAnalysisOptions) {
    const [isLoading, setIsLoading] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');
    const debouncedParagraph = useDebounce(paragraph, 800);
    const lastAnalyzedParagraphRef = useRef<string | null>(null);

    const runAnalysis = useCallback(
        async (text: string): Promise<void> => {
            if (text.trim() === '') {
                setStatusMessage('');
                replaceWords([]);
                return;
            }

            setIsLoading(true);
            const result = await fetchMarkAccent(text);

            if (result.length > 0) {
                replaceWords(mapApiResultToWords(result));
                setStatusMessage(`解析結果を更新しました。${result.length}件の語を表示しています。`);
            } else {
                replaceWords(mapFallbackTextToWords(text));
                setStatusMessage('サーバーからの応答がないため、簡易解析結果を表示しています。');
            }

            setIsLoading(false);
        },
        [replaceWords],
    );

    useEffect(() => {
        if (isEditing) return;
        if (lastAnalyzedParagraphRef.current === debouncedParagraph) return;

        lastAnalyzedParagraphRef.current = debouncedParagraph;
        runAnalysis(debouncedParagraph);
    }, [debouncedParagraph, isEditing, runAnalysis]);

    return {
        isLoading,
        statusMessage,
    };
}
