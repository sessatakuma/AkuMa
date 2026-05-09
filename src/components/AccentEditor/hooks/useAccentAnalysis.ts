import { useCallback, useEffect, useRef, useState } from 'react';

import useThrottle from '../../../hooks/useThrottle';
import { fetchMarkAccent } from '../core/api/markAccentClient';
import { mapApiResultToWords, mapFallbackTextToWords } from '../core/word/accentMappers';

import type { Word } from '../core/word/accentTypes';

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
    const [analysisVersion, setAnalysisVersion] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');
    const throttledParagraph = useThrottle(paragraph, 800);
    const lastAnalyzedParagraphRef = useRef<string | null>(null);
    const activeRequestIdRef = useRef(0);

    const runAnalysis = useCallback(
        async (text: string): Promise<void> => {
            if (text.trim() === '') {
                activeRequestIdRef.current += 1;
                setStatusMessage('');
                setIsLoading(false);
                setAnalysisVersion(0);
                replaceWords([]);
                return;
            }

            const requestId = activeRequestIdRef.current + 1;
            activeRequestIdRef.current = requestId;
            setIsLoading(true);
            const response = await fetchMarkAccent(text);
            if (activeRequestIdRef.current !== requestId) {
                return;
            }

            if (!response.ok) {
                replaceWords(mapFallbackTextToWords(text));
                setAnalysisVersion(currentVersion => currentVersion + 1);
                setStatusMessage('サーバーからの応答がないため、簡易解析結果を表示しています。');
                setIsLoading(false);
                return;
            }

            replaceWords(mapApiResultToWords(response.result));
            setAnalysisVersion(currentVersion => currentVersion + 1);
            setStatusMessage(`解析結果を更新しました。${response.result.length}件の語を表示しています。`);

            setIsLoading(false);
        },
        [replaceWords],
    );

    useEffect(() => {
        if (isEditing) return;
        if (lastAnalyzedParagraphRef.current === throttledParagraph) return;

        lastAnalyzedParagraphRef.current = throttledParagraph;
        runAnalysis(throttledParagraph);
    }, [isEditing, runAnalysis, throttledParagraph]);

    return {
        analysisVersion,
        isLoading,
        statusMessage,
    };
}
