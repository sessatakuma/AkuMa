import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import Kana from './AccentEditor/components/Kana';
import { type AccentValueType } from './AccentEditor/core/word/accentTypes';
import './UsageAccentDemo.css';

const DEMO_READING = ['は', 'し'] as const;
const DEMO_SURFACE = '箸';

type CursorState = 'hidden' | 'entering' | 'hover' | 'click' | 'result' | 'moving' | 'exiting';

interface AnimationPhase {
    accents: AccentValueType[];
    cursor: CursorState;
    cursorTarget: number;
    delay: number;
}

const INITIAL_ACCENTS: AccentValueType[] = [1, 2];
const MIDDLE_ACCENTS: AccentValueType[] = [2, 2];
const FINAL_ACCENTS: AccentValueType[] = [2, 0];

const DEMO_PHASES = buildDemoPhases();

function buildDemoPhases(): AnimationPhase[] {
    return [
        { accents: [...INITIAL_ACCENTS], cursor: 'hidden', cursorTarget: -1, delay: 1200 },
        { accents: [...INITIAL_ACCENTS], cursor: 'entering', cursorTarget: 0, delay: 450 },
        { accents: [...INITIAL_ACCENTS], cursor: 'hover', cursorTarget: 0, delay: 350 },
        { accents: [...MIDDLE_ACCENTS], cursor: 'click', cursorTarget: 0, delay: 220 },
        { accents: [...MIDDLE_ACCENTS], cursor: 'result', cursorTarget: 0, delay: 420 },
        { accents: [...MIDDLE_ACCENTS], cursor: 'moving', cursorTarget: 1, delay: 300 },
        { accents: [...MIDDLE_ACCENTS], cursor: 'hover', cursorTarget: 1, delay: 320 },
        { accents: [...FINAL_ACCENTS], cursor: 'click', cursorTarget: 1, delay: 220 },
        { accents: [...FINAL_ACCENTS], cursor: 'result', cursorTarget: 1, delay: 420 },
        { accents: [...FINAL_ACCENTS], cursor: 'exiting', cursorTarget: 1, delay: 2000 },
    ];
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
    cellRefs: React.RefObject<(HTMLSpanElement | null)[]>,
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
    const cellRefs = useRef<(HTMLSpanElement | null)[]>([]);
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
                <span className='usage-demo-word-stack' aria-hidden='true'>
                    <span className='usage-demo-reading-row'>
                        {DEMO_READING.map((kana, index) => (
                            <span
                                key={index}
                                ref={node => {
                                    cellRefs.current[index] = node;
                                }}
                                className='usage-accent-kana-cell usage-demo-reading-cell'
                                data-cursor-target={
                                    index === cursorTarget && cursorState !== 'hidden'
                                        ? ''
                                        : undefined
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
                            </span>
                        ))}
                    </span>
                    <span className='usage-demo-base-row' aria-hidden='true'>
                        <span className='usage-demo-base-cell'>{DEMO_SURFACE}</span>
                    </span>
                </span>
            </div>
        </div>
    );
}
