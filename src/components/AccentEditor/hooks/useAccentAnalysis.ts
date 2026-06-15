import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from '../../../auth/AuthContext';
import useThrottle from '../../../hooks/useThrottle';
import { useI18n } from '../../../i18n';
import { streamMarkAccent } from '../core/api/markAccentClient';
import { mapApiResultToWords, mapFallbackTextToWords } from '../core/word/accentMappers';
import { AccentValue, type Word } from '../core/word/accentTypes';

function createLineBreakWords(count: number): Word[] {
    if (count <= 0) {
        return [];
    }

    return Array.from({ length: count }, () => ({
        surface: '\n',
        furigana: [],
        accent: AccentValue.None,
    }));
}

const VISIBLE_LOADING_DELAY_MS = 500;

interface UseAccentAnalysisOptions {
    isEditing: boolean;
    paragraph: string;
    onTemporaryIssue: () => void;
    replaceWords: (words: Word[]) => void;
    streamReplaceWords: (words: Word[]) => void;
}

export function useAccentAnalysis({
    isEditing,
    onTemporaryIssue,
    paragraph,
    replaceWords,
    streamReplaceWords,
}: UseAccentAnalysisOptions) {
    const { t } = useI18n();
    const { accessToken, isAuthReady } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [isStreaming, setIsStreaming] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');
    const throttledParagraph = useThrottle(paragraph, 800);
    const lastAnalyzedParagraphRef = useRef<string | null>(null);
    const activeRequestIdRef = useRef(0);
    const visibleLoadingTimeoutRef = useRef<number | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    const clearVisibleLoadingTimeout = useCallback((): void => {
        if (visibleLoadingTimeoutRef.current !== null) {
            window.clearTimeout(visibleLoadingTimeoutRef.current);
            visibleLoadingTimeoutRef.current = null;
        }
    }, []);

    const abortInFlightRequest = useCallback((): void => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
    }, []);

    const runAnalysis = useCallback(
        async (text: string): Promise<void> => {
            if (text.trim() === '') {
                activeRequestIdRef.current += 1;
                abortInFlightRequest();
                clearVisibleLoadingTimeout();
                setStatusMessage('');
                setIsLoading(false);
                setIsStreaming(false);
                replaceWords([]);
                return;
            }

            const requestId = activeRequestIdRef.current + 1;
            activeRequestIdRef.current = requestId;
            abortInFlightRequest();
            clearVisibleLoadingTimeout();

            if (!isAuthReady || !accessToken) {
                setStatusMessage('Sign in to annotate Japanese text.');
                setIsLoading(false);
                setIsStreaming(false);
                replaceWords([]);
                return;
            }

            setIsLoading(false);
            setIsStreaming(false);
            visibleLoadingTimeoutRef.current = window.setTimeout(() => {
                if (activeRequestIdRef.current === requestId) {
                    setIsLoading(true);
                }
            }, VISIBLE_LOADING_DELAY_MS);

            const abortController = new AbortController();
            abortControllerRef.current = abortController;

            const accumulated: Word[] = [];
            let receivedAnyChunk = false;
            let lastChunkIdx = -1;

            const result = await streamMarkAccent(text, {
                accessToken,
                signal: abortController.signal,
                onChunk: ({ chunk, result: chunkResult, subchunk }) => {
                    if (activeRequestIdRef.current !== requestId) {
                        return;
                    }

                    if (!receivedAnyChunk) {
                        receivedAnyChunk = true;
                        clearVisibleLoadingTimeout();
                        setIsLoading(false);
                        setIsStreaming(true);
                    }

                    if (subchunk === 0) {
                        const lineBreaks = lastChunkIdx < 0 ? chunk : chunk - lastChunkIdx;
                        accumulated.push(...createLineBreakWords(lineBreaks));
                    }
                    lastChunkIdx = chunk;

                    accumulated.push(...mapApiResultToWords(chunkResult));
                    streamReplaceWords([...accumulated]);
                },
            });

            if (activeRequestIdRef.current !== requestId) {
                return;
            }

            clearVisibleLoadingTimeout();
            abortControllerRef.current = null;

            if (!result.ok) {
                setIsStreaming(false);

                if (result.reason === 'aborted') {
                    setIsLoading(false);
                    return;
                }

                replaceWords(mapFallbackTextToWords(text));
                setStatusMessage(t.fallbackStatus);
                onTemporaryIssue();

                setIsLoading(false);
                return;
            }

            if (!receivedAnyChunk || accumulated.length === 0) {
                replaceWords(mapFallbackTextToWords(text));
                setStatusMessage(t.fallbackStatus);
                setIsStreaming(false);
                setIsLoading(false);
                onTemporaryIssue();
                return;
            }

            replaceWords([...accumulated]);

            setStatusMessage(t.statusUpdated(accumulated.length));
            setIsStreaming(false);
            setIsLoading(false);
        },
        [
            abortInFlightRequest,
            accessToken,
            clearVisibleLoadingTimeout,
            isAuthReady,
            onTemporaryIssue,
            replaceWords,
            streamReplaceWords,
            t,
        ],
    );

    useEffect(() => {
        if (isEditing) return;
        if (lastAnalyzedParagraphRef.current === throttledParagraph) return;

        lastAnalyzedParagraphRef.current = throttledParagraph;
        runAnalysis(throttledParagraph);
    }, [isEditing, runAnalysis, throttledParagraph]);

    useEffect(
        () => () => {
            clearVisibleLoadingTimeout();
            abortInFlightRequest();
        },
        [abortInFlightRequest, clearVisibleLoadingTimeout],
    );

    return {
        isLoading,
        isStreaming,
        statusMessage,
    };
}
