import { useEffect, useLayoutEffect, useRef, useState } from 'react';

const LOADING_CHARACTER_INTERVAL_MS = 22;
const FURIGANA_REVEAL_INTERVAL_MS = 40;
const ACCENT_REVEAL_INTERVAL_MS = 36;
const PHASE_GAP_MS = 80;
const REVEAL_ACCELERATION_START = 0.8;
const REVEAL_MIN_INTERVAL_MULTIPLIER = 0.4;

function getRevealStepDelay(totalUnits: number, stepIndex: number, baseIntervalMs: number) {
    if (totalUnits <= 1) {
        return baseIntervalMs;
    }

    const progress = stepIndex / totalUnits;
    if (progress <= REVEAL_ACCELERATION_START) {
        return baseIntervalMs;
    }

    const tailProgress =
        (progress - REVEAL_ACCELERATION_START) / (1 - REVEAL_ACCELERATION_START);
    const intervalMultiplier =
        1 - (1 - REVEAL_MIN_INTERVAL_MULTIPLIER) * tailProgress;

    return Math.max(12, Math.round(baseIntervalMs * intervalMultiplier));
}

function getRevealTotals(
    words: Array<{
        accent: number | number[];
        furigana: Array<unknown>;
    }>,
) {
    const furiganaUnits = words.reduce((count, word) => count + word.furigana.length, 0);
    const accentUnits = words.reduce((count, word) => {
        if (Array.isArray(word.accent)) {
            return count + word.accent.length;
        }

        return count + word.furigana.length;
    }, 0);

    return { accentUnits, furiganaUnits };
}

export function useResultReveal({
    analysisVersion,
    isLoading,
    paragraph,
    words,
}: {
    analysisVersion: number;
    isLoading: boolean;
    paragraph: string;
    words: Array<{
        accent: number | number[];
        furigana: Array<unknown>;
    }>;
}) {
    const preparedAnalysisVersionRef = useRef(analysisVersion);
    const animatedAnalysisVersionRef = useRef(analysisVersion);
    const [revealedLoadingCharacters, setRevealedLoadingCharacters] = useState(0);
    const [revealedFuriganaUnits, setRevealedFuriganaUnits] = useState(0);
    const [revealedAccentUnits, setRevealedAccentUnits] = useState(0);
    const [isPresenting, setIsPresenting] = useState(false);
    const { accentUnits, furiganaUnits } = getRevealTotals(words);
    const shouldMaskNewAnalysis =
        !isLoading && words.length > 0 && analysisVersion !== preparedAnalysisVersionRef.current;

    useEffect(() => {
        if (paragraph.trim() === '') {
            setRevealedLoadingCharacters(0);
            return;
        }

        if (!isLoading) {
            return;
        }

        const characters = [...paragraph].filter(character => !/\s/.test(character));
        if (characters.length === 0) {
            setRevealedLoadingCharacters(0);
            return;
        }

        setRevealedLoadingCharacters(0);

        const intervalId = window.setInterval(() => {
            setRevealedLoadingCharacters(currentCount => {
                if (currentCount >= characters.length) {
                    window.clearInterval(intervalId);
                    return currentCount;
                }

                return currentCount + 1;
            });
        }, LOADING_CHARACTER_INTERVAL_MS);

        return () => window.clearInterval(intervalId);
    }, [isLoading, paragraph]);

    useLayoutEffect(() => {
        if (isLoading || words.length === 0) {
            return;
        }

        if (analysisVersion === animatedAnalysisVersionRef.current) {
            return;
        }

        preparedAnalysisVersionRef.current = analysisVersion;

        if (furiganaUnits === 0 && accentUnits === 0) {
            return;
        }

        setIsPresenting(true);
        setRevealedFuriganaUnits(0);
        setRevealedAccentUnits(0);
    }, [accentUnits, analysisVersion, furiganaUnits, isLoading, words.length]);

    useEffect(() => {
        if (isLoading || words.length === 0) {
            if (!isLoading && words.length === 0) {
                setIsPresenting(false);
                setRevealedFuriganaUnits(0);
                setRevealedAccentUnits(0);
            }
            return;
        }

        if (furiganaUnits === 0 && accentUnits === 0) {
            setIsPresenting(false);
            setRevealedFuriganaUnits(0);
            setRevealedAccentUnits(0);
            return;
        }

        if (analysisVersion === animatedAnalysisVersionRef.current) {
            return;
        }

        animatedAnalysisVersionRef.current = analysisVersion;
        setIsPresenting(true);
        setRevealedFuriganaUnits(0);
        setRevealedAccentUnits(0);

        let elapsedMs = 0;
        const timeoutIds: number[] = [];

        for (let index = 1; index <= furiganaUnits; index += 1) {
            elapsedMs += getRevealStepDelay(furiganaUnits, index, FURIGANA_REVEAL_INTERVAL_MS);
            timeoutIds.push(window.setTimeout(() => setRevealedFuriganaUnits(index), elapsedMs));
        }

        if (accentUnits > 0) {
            elapsedMs += PHASE_GAP_MS;
        }

        for (let index = 1; index <= accentUnits; index += 1) {
            elapsedMs += getRevealStepDelay(accentUnits, index, ACCENT_REVEAL_INTERVAL_MS);
            timeoutIds.push(window.setTimeout(() => setRevealedAccentUnits(index), elapsedMs));
        }

        timeoutIds.push(
            window.setTimeout(() => {
                setIsPresenting(false);
                setRevealedFuriganaUnits(furiganaUnits);
                setRevealedAccentUnits(accentUnits);
            }, elapsedMs + PHASE_GAP_MS),
        );

        return () => timeoutIds.forEach(timeoutId => window.clearTimeout(timeoutId));
    }, [accentUnits, analysisVersion, furiganaUnits, isLoading, words.length]);

    useEffect(() => {
        if (isLoading || isPresenting) {
            return;
        }

        setRevealedFuriganaUnits(furiganaUnits);
        setRevealedAccentUnits(accentUnits);
    }, [accentUnits, furiganaUnits, isLoading, isPresenting]);

    return {
        isPresenting: shouldMaskNewAnalysis || isPresenting,
        revealedAccentUnits: shouldMaskNewAnalysis ? 0 : revealedAccentUnits,
        revealedFuriganaUnits: shouldMaskNewAnalysis ? 0 : revealedFuriganaUnits,
        revealedLoadingCharacters,
    };
}
