import { useEffect, useLayoutEffect, useRef, useState } from 'react';

const LOADING_CHARACTER_INTERVAL_MS = 22;
const FURIGANA_REVEAL_INTERVAL_MS = 28;
const ACCENT_REVEAL_INTERVAL_MS = 24;
const PHASE_GAP_MS = 48;
const REVEAL_ACCELERATION_START = 0.55;
const REVEAL_MIN_INTERVAL_MULTIPLIER = 0.18;

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
    const easedTailProgress = tailProgress * tailProgress;
    const intervalMultiplier =
        1 - (1 - REVEAL_MIN_INTERVAL_MULTIPLIER) * easedTailProgress;

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

interface RevealState {
    analysisVersion: number;
    phase: 'idle' | 'furigana' | 'accent' | 'complete';
    revealedAccentUnits: number;
    revealedFuriganaUnits: number;
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
    const animatedAnalysisVersionRef = useRef(analysisVersion);
    const [revealedLoadingCharacters, setRevealedLoadingCharacters] = useState(0);
    const [revealState, setRevealState] = useState<RevealState>({
        analysisVersion,
        phase: 'idle',
        revealedAccentUnits: 0,
        revealedFuriganaUnits: 0,
    });
    const { accentUnits, furiganaUnits } = getRevealTotals(words);
    const isStaleRevealState =
        !isLoading && words.length > 0 && revealState.analysisVersion !== analysisVersion;

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

        if (analysisVersion === revealState.analysisVersion) {
            return;
        }

        if (furiganaUnits === 0 && accentUnits === 0) {
            return;
        }

        setRevealState({
            analysisVersion,
            phase: 'furigana',
            revealedAccentUnits: 0,
            revealedFuriganaUnits: 0,
        });
    }, [accentUnits, analysisVersion, furiganaUnits, isLoading, revealState.analysisVersion, words.length]);

    useEffect(() => {
        if (isLoading || words.length === 0) {
            if (!isLoading && words.length === 0) {
                setRevealState(currentState => ({
                    ...currentState,
                    phase: 'idle',
                    revealedAccentUnits: 0,
                    revealedFuriganaUnits: 0,
                }));
            }
            return;
        }

        if (furiganaUnits === 0 && accentUnits === 0) {
            setRevealState(currentState => ({
                ...currentState,
                phase: 'idle',
                revealedAccentUnits: 0,
                revealedFuriganaUnits: 0,
            }));
            return;
        }

        if (analysisVersion === animatedAnalysisVersionRef.current) {
            return;
        }

        animatedAnalysisVersionRef.current = analysisVersion;
        setRevealState(currentState =>
            currentState.analysisVersion !== analysisVersion
                ? currentState
                : {
                      ...currentState,
                      phase: 'furigana',
                      revealedAccentUnits: 0,
                      revealedFuriganaUnits: 0,
                  },
        );

        let elapsedMs = 0;
        const timeoutIds: number[] = [];

        for (let index = 1; index <= furiganaUnits; index += 1) {
            elapsedMs += getRevealStepDelay(furiganaUnits, index, FURIGANA_REVEAL_INTERVAL_MS);
            timeoutIds.push(
                window.setTimeout(() => {
                    setRevealState(currentState =>
                        currentState.analysisVersion !== analysisVersion
                            ? currentState
                            : {
                                  ...currentState,
                                  phase: 'furigana',
                                  revealedFuriganaUnits: index,
                              },
                    );
                }, elapsedMs),
            );
        }

        if (accentUnits > 0) {
            elapsedMs += PHASE_GAP_MS;
            timeoutIds.push(
                window.setTimeout(() => {
                    setRevealState(currentState =>
                        currentState.analysisVersion !== analysisVersion
                            ? currentState
                            : {
                                  ...currentState,
                                  phase: 'accent',
                              },
                    );
                }, elapsedMs),
            );
        }

        for (let index = 1; index <= accentUnits; index += 1) {
            elapsedMs += getRevealStepDelay(accentUnits, index, ACCENT_REVEAL_INTERVAL_MS);
            timeoutIds.push(
                window.setTimeout(() => {
                    setRevealState(currentState =>
                        currentState.analysisVersion !== analysisVersion
                            ? currentState
                            : {
                                  ...currentState,
                                  phase: 'accent',
                                  revealedAccentUnits: index,
                              },
                    );
                }, elapsedMs),
            );
        }

        timeoutIds.push(
            window.setTimeout(() => {
                setRevealState(currentState =>
                    currentState.analysisVersion !== analysisVersion
                        ? currentState
                        : {
                              ...currentState,
                              phase: 'complete',
                              revealedAccentUnits: accentUnits,
                              revealedFuriganaUnits: furiganaUnits,
                          },
                );
            }, elapsedMs + PHASE_GAP_MS),
        );

        return () => timeoutIds.forEach(timeoutId => window.clearTimeout(timeoutId));
    }, [accentUnits, analysisVersion, furiganaUnits, isLoading, words.length]);

    useEffect(() => {
        if (isLoading || revealState.phase === 'furigana' || revealState.phase === 'accent') {
            return;
        }

        setRevealState(currentState => {
            if (
                currentState.analysisVersion !== analysisVersion ||
                (currentState.revealedAccentUnits === accentUnits &&
                    currentState.revealedFuriganaUnits === furiganaUnits)
            ) {
                return currentState;
            }

            return {
                ...currentState,
                revealedAccentUnits: accentUnits,
                revealedFuriganaUnits: furiganaUnits,
            };
        });
    }, [accentUnits, analysisVersion, furiganaUnits, isLoading, revealState.phase]);

    const revealPhase = isStaleRevealState ? 'furigana' : revealState.phase;

    return {
        accentPhaseActive: revealPhase === 'accent' || revealPhase === 'complete',
        isPresenting: revealPhase === 'furigana' || revealPhase === 'accent',
        revealedAccentUnits: isStaleRevealState ? 0 : revealState.revealedAccentUnits,
        revealedFuriganaUnits: isStaleRevealState ? 0 : revealState.revealedFuriganaUnits,
        revealedLoadingCharacters,
    };
}
