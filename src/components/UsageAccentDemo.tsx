import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import Kana from './AccentEditor/components/Kana';
import { type AccentValueType } from './AccentEditor/core/word/accentTypes';

const DEMO_KANA = ['あ', 'く', 'せ', 'ん', 'と'] as const;

type CursorState = 'hidden' | 'entering' | 'hover' | 'click' | 'result' | 'moving' | 'exiting';

interface AnimationPhase {
    accents: AccentValueType[];
    cursor: CursorState;
    cursorTarget: number;
    delay: number;
}

const INITIAL_ACCENTS: AccentValueType[] = [1, 1, 1, 1, 2];

const DEMO_CLICKS: [number, AccentValueType[]][] = [
    [4, [1, 1, 1, 1, 0]],
    [3, [1, 1, 1, 2, 0]],
    [3, [1, 1, 1, 0, 0]],
    [2, [1, 1, 2, 0, 0]],
    [2, [1, 1, 0, 0, 0]],
    [1, [1, 2, 0, 0, 0]],
    [1, [1, 0, 0, 0, 0]],
    [0, [2, 0, 0, 0, 0]],
];

const DEMO_PHASES = buildDemoPhases();

function buildDemoPhases(): AnimationPhase[] {
    const phases: AnimationPhase[] = [
        { accents: [...INITIAL_ACCENTS], cursor: 'hidden', cursorTarget: -1, delay: 1500 },
        { accents: [...INITIAL_ACCENTS], cursor: 'entering', cursorTarget: 4, delay: 600 },
    ];

    let previousTarget = 4;
    let previousAccents = [...INITIAL_ACCENTS];

    for (let index = 0; index < DEMO_CLICKS.length; index += 1) {
        const [target, accents] = DEMO_CLICKS[index];
        const movedToNewTarget = target !== previousTarget;

        if (movedToNewTarget) {
            phases.push({
                accents: [...previousAccents],
                cursor: 'moving',
                cursorTarget: target,
                delay: 300,
            });
            phases.push({
                accents: [...previousAccents],
                cursor: 'hover',
                cursorTarget: target,
                delay: 350,
            });
        }

        phases.push({ accents: [...accents], cursor: 'click', cursorTarget: target, delay: 250 });

        const isLastPhase = index === DEMO_CLICKS.length - 1;
        phases.push({
            accents: [...accents],
            cursor: 'result',
            cursorTarget: target,
            delay: isLastPhase ? 800 : movedToNewTarget ? 450 : 350,
        });

        previousTarget = target;
        previousAccents = [...accents];
    }

    phases.push({ accents: [2, 0, 0, 0, 0], cursor: 'exiting', cursorTarget: 0, delay: 600 });

    return phases;
}

function CursorPointer() {
    return (
        <svg
            className='usage-cursor-icon'
            width='14'
            height='19'
            viewBox='0 0 14 19'
            fill='none'
            aria-hidden='true'
        >
            <path
                d='M1.5 1.5v12.5l3.4-3.1 3.1 6.6 1.6-.8-3.1-6.6h5L1.5 1.5z'
                fill='white'
                stroke='var(--color-text-tertiary, #888)'
                strokeWidth='1'
                strokeLinejoin='round'
            />
        </svg>
    );
}

function useReducedMotionPreference(): boolean {
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches);

        updatePreference();
        mediaQuery.addEventListener('change', updatePreference);

        return () => mediaQuery.removeEventListener('change', updatePreference);
    }, []);

    return prefersReducedMotion;
}

function useCursorOffset(
    wordRef: React.RefObject<HTMLDivElement | null>,
    cellRefs: React.RefObject<(HTMLDivElement | null)[]>,
    cursorTarget: number,
    cursorState: CursorState,
): number {
    const [offset, setOffset] = useState(0);

    const measure = useCallback(() => {
        const cell = cellRefs.current?.[cursorTarget];
        const word = wordRef.current;

        if (!cell || !word || cursorTarget < 0 || cursorState === 'hidden') {
            return;
        }

        const wordRect = word.getBoundingClientRect();
        const cellRect = cell.getBoundingClientRect();
        setOffset(cellRect.left - wordRect.left + cellRect.width / 2);
    }, [cursorTarget, cursorState]);

    useLayoutEffect(() => {
        measure();
    }, [measure]);

    useEffect(() => {
        window.addEventListener('resize', measure);
        return () => window.removeEventListener('resize', measure);
    }, [measure]);

    return offset;
}

export default function UsageAccentDemo() {
    const wordRef = useRef<HTMLDivElement>(null);
    const cellRefs = useRef<(HTMLDivElement | null)[]>([]);
    const [phaseIndex, setPhaseIndex] = useState(0);
    const prefersReducedMotion = useReducedMotionPreference();
    const phase = DEMO_PHASES[phaseIndex];
    const currentAccents = prefersReducedMotion ? INITIAL_ACCENTS : phase.accents;
    const cursorState = prefersReducedMotion ? 'hidden' : phase.cursor;
    const cursorTarget = prefersReducedMotion ? -1 : phase.cursorTarget;
    const cursorOffset = useCursorOffset(wordRef, cellRefs, cursorTarget, cursorState);

    useEffect(() => {
        if (prefersReducedMotion) {
            return;
        }

        const timer = window.setTimeout(() => {
            setPhaseIndex(previous => (previous + 1) % DEMO_PHASES.length);
        }, DEMO_PHASES[phaseIndex].delay);

        return () => window.clearTimeout(timer);
    }, [phaseIndex, prefersReducedMotion]);

    return (
        <div className='usage-edit-showcase'>
            <div
                ref={wordRef}
                className={[
                    'usage-accent-word',
                    cursorState !== 'hidden' && `usage-accent-cursor-state-${cursorState}`,
                ]
                    .filter(Boolean)
                    .join(' ')}
            >
                {cursorState !== 'hidden' && (
                    <div
                        className='usage-cursor-track'
                        style={
                            {
                                '--cursor-x': `${cursorOffset}px`,
                            } as React.CSSProperties
                        }
                    >
                        <CursorPointer />
                    </div>
                )}
                {DEMO_KANA.map((kana, index) => (
                    <div
                        key={index}
                        ref={node => {
                            cellRefs.current[index] = node;
                        }}
                        className='usage-accent-kana-cell'
                        data-cursor-target={
                            index === cursorTarget && cursorState !== 'hidden' ? '' : undefined
                        }
                    >
                        <Kana
                            accent={currentAccents[index]}
                            accentPhaseActive
                            accentVisible
                            interactive={false}
                            text={kana}
                            textVisible
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}
