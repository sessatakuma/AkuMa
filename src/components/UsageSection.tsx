import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { Clipboard, CodeXml, Copy, Dices, Keyboard, Image as ImageIcon } from 'lucide-react';

import { useI18n } from '../i18n';

import Kana from './AccentEditor/components/Kana';
import { type AccentValueType } from './AccentEditor/core/word/accentTypes';

import './UsageSection.css';

const DEMO_KANA = ['あ', 'く', 'せ', 'ん', 'と'] as const;

type CursorState = 'hidden' | 'entering' | 'hover' | 'click' | 'result' | 'moving' | 'exiting';

interface AnimPhase {
    accents: AccentValueType[];
    cursor: CursorState;
    cursorTarget: number;
    delay: number;
}

const INITIAL_ACCENTS: AccentValueType[] = [1, 1, 1, 1, 2];

const CLICKS: [number, AccentValueType[]][] = [
    [4, [1, 1, 1, 1, 0]],
    [3, [1, 1, 1, 2, 0]],
    [3, [1, 1, 1, 0, 0]],
    [2, [1, 1, 2, 0, 0]],
    [2, [1, 1, 0, 0, 0]],
    [1, [1, 2, 0, 0, 0]],
    [1, [1, 0, 0, 0, 0]],
    [0, [2, 0, 0, 0, 0]],
];

function buildPhases(): AnimPhase[] {
    const phases: AnimPhase[] = [
        { accents: [...INITIAL_ACCENTS], cursor: 'hidden', cursorTarget: -1, delay: 1500 },
        { accents: [...INITIAL_ACCENTS], cursor: 'entering', cursorTarget: 4, delay: 600 },
    ];

    let prevTarget = 4;
    let prevAccents = [...INITIAL_ACCENTS];

    for (let i = 0; i < CLICKS.length; i++) {
        const [target, accents] = CLICKS[i];
        const isNewTarget = target !== prevTarget;

        if (isNewTarget) {
            phases.push({
                accents: [...prevAccents],
                cursor: 'moving',
                cursorTarget: target,
                delay: 300,
            });
            phases.push({
                accents: [...prevAccents],
                cursor: 'hover',
                cursorTarget: target,
                delay: 350,
            });
        }

        phases.push({ accents: [...accents], cursor: 'click', cursorTarget: target, delay: 250 });

        const isLast = i === CLICKS.length - 1;
        const resultDelay = isLast ? 800 : isNewTarget ? 450 : 350;
        phases.push({
            accents: [...accents],
            cursor: 'result',
            cursorTarget: target,
            delay: resultDelay,
        });

        prevTarget = target;
        prevAccents = [...accents];
    }

    phases.push({ accents: [2, 0, 0, 0, 0], cursor: 'exiting', cursorTarget: 0, delay: 600 });

    return phases;
}

const ANIM_PHASES = buildPhases();

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

function renderHeadingSegment(segment: string) {
    const emphasisMatch = /(更自然|更清楚)/.exec(segment);

    if (!emphasisMatch) {
        return segment;
    }

    const [emphasis] = emphasisMatch;
    const emphasisIndex = emphasisMatch.index;

    return (
        <>
            {segment.slice(0, emphasisIndex)}
            <span className='usage-heading-primary'>{emphasis}</span>
            {segment.slice(emphasisIndex + emphasis.length)}
        </>
    );
}

function renderUsageHeading(heading: string) {
    const splitIndex = heading.indexOf('、');

    if (splitIndex === -1) {
        return heading;
    }

    return (
        <>
            <span className='usage-heading-segment'>
                {renderHeadingSegment(heading.slice(0, splitIndex + 1))}
            </span>
            <span className='usage-heading-segment'>
                {renderHeadingSegment(heading.slice(splitIndex + 1))}
            </span>
        </>
    );
}

export default function UsageSection() {
    const { t } = useI18n();
    const sectionRef = useRef<HTMLElement>(null);
    const wordRef = useRef<HTMLDivElement>(null);
    const cellRefs = useRef<(HTMLDivElement | null)[]>([]);
    const [phaseIndex, setPhaseIndex] = useState(0);

    const phase = ANIM_PHASES[phaseIndex];
    const prefersReducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const currentAccents = prefersReducedMotion ? INITIAL_ACCENTS : phase.accents;
    const cursorState = prefersReducedMotion ? 'hidden' : phase.cursor;
    const cursorTarget = prefersReducedMotion ? -1 : phase.cursorTarget;
    const cursorOffset = useCursorOffset(wordRef, cellRefs, cursorTarget, cursorState);

    useEffect(() => {
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        if (prefersReducedMotion) {
            return;
        }

        const timer = setTimeout(() => {
            setPhaseIndex(prev => (prev + 1) % ANIM_PHASES.length);
        }, ANIM_PHASES[phaseIndex].delay);

        return () => clearTimeout(timer);
    }, [phaseIndex]);

    useEffect(() => {
        const section = sectionRef.current;

        if (!section) {
            return;
        }

        const targets = Array.from(section.querySelectorAll<HTMLElement>('.usage-reveal-target'));

        if (targets.length === 0) {
            return;
        }

        if (
            window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
            !('IntersectionObserver' in window)
        ) {
            targets.forEach(target => target.classList.add('is-visible'));
            return;
        }

        section.dataset.revealReady = 'true';

        const revealTarget = (target: Element) => {
            target.classList.add('is-visible');
            observer.unobserve(target);
        };

        const revealReachedTargets = () => {
            targets.forEach(target => {
                if (target.classList.contains('is-visible')) {
                    return;
                }

                if (target.getBoundingClientRect().top < window.innerHeight * 0.9) {
                    revealTarget(target);
                }
            });
        };

        const observer = new IntersectionObserver(
            entries => {
                entries.forEach(entry => {
                    const hasReachedViewport =
                        entry.isIntersecting || entry.boundingClientRect.top < window.innerHeight;

                    if (!hasReachedViewport) {
                        return;
                    }

                    revealTarget(entry.target);
                });
            },
            {
                rootMargin: '0px 0px -10% 0px',
                threshold: 0.15,
            },
        );

        targets.forEach(target => observer.observe(target));
        window.addEventListener('scroll', revealReachedTargets, { passive: true });
        window.addEventListener('resize', revealReachedTargets);
        window.requestAnimationFrame(revealReachedTargets);

        return () => {
            observer.disconnect();
            window.removeEventListener('scroll', revealReachedTargets);
            window.removeEventListener('resize', revealReachedTargets);
            delete section.dataset.revealReady;
        };
    }, []);

    return (
        <section ref={sectionRef} className='usage-section' aria-labelledby='usage-heading'>
            <div className='usage-section-inner'>
                <div
                    className='usage-pitch-primer usage-reveal-target'
                    aria-label={t.usagePitchHeading}
                >
                    <div className='usage-pitch-intro'>
                        <div className='usage-section-copy'>
                            <h2 id='usage-heading'>{renderUsageHeading(t.usageHeading)}</h2>
                        </div>
                        <div className='usage-pitch-copy'>
                            <p>{t.usagePitchIntro}</p>
                        </div>
                    </div>
                    <div className='usage-pitch-states'>
                        <article className='usage-pitch-state'>
                            <div className='usage-pitch-mark' aria-hidden='true'>
                                <span className='kana-shell' data-accent='none'>
                                    <span className='kana-accent-lane'></span>
                                    <span className='kana-text' data-text-visible='true'>
                                        は
                                    </span>
                                </span>
                            </div>
                            <h4>{t.usagePitchNoneTitle}</h4>
                            <p>{t.usagePitchNoneBody}</p>
                        </article>
                        <article className='usage-pitch-state'>
                            <div className='usage-pitch-mark' aria-hidden='true'>
                                <span
                                    className='kana-shell'
                                    data-accent='flat'
                                    data-accent-phase-active='true'
                                    data-accent-visible='true'
                                >
                                    <span className='kana-accent-lane'>
                                        <span className='kana-accent-line'></span>
                                    </span>
                                    <span className='kana-text' data-text-visible='true'>
                                        あ
                                    </span>
                                </span>
                            </div>
                            <h4>{t.usagePitchFlatTitle}</h4>
                            <p>{t.usagePitchFlatBody}</p>
                        </article>
                        <article className='usage-pitch-state'>
                            <div className='usage-pitch-mark' aria-hidden='true'>
                                <span
                                    className='kana-shell'
                                    data-accent='drop'
                                    data-accent-phase-active='true'
                                    data-accent-visible='true'
                                >
                                    <span className='kana-accent-lane'>
                                        <span className='kana-accent-line'></span>
                                        <span className='kana-accent-drop'></span>
                                    </span>
                                    <span className='kana-text' data-text-visible='true'>
                                        あ
                                    </span>
                                </span>
                            </div>
                            <h4>{t.usagePitchFallTitle}</h4>
                            <p>{t.usagePitchFallBody}</p>
                        </article>
                    </div>
                </div>
                <div id='usage-guide' className='usage-guide' aria-label={t.usageHeading}>
                    <article className='usage-guide-card usage-reveal-target'>
                        <div
                            className='usage-guide-preview usage-guide-preview-start'
                            aria-hidden='true'
                        >
                            <div className='usage-action-showcase'>
                                <span className='usage-action-icon'>
                                    <Keyboard size={40} />
                                </span>
                                <span className='usage-action-icon'>
                                    <Clipboard size={40} />
                                </span>
                                <span className='usage-action-icon'>
                                    <Dices size={40} />
                                </span>
                            </div>
                        </div>
                        <div className='usage-guide-copy'>
                            <h3>{t.usageStepStartTitle}</h3>
                            <p>{t.usageStepStartBody}</p>
                        </div>
                    </article>
                    <article className='usage-guide-card usage-reveal-target'>
                        <div
                            className='usage-guide-preview usage-guide-preview-edit'
                            aria-hidden='true'
                        >
                            <div className='usage-edit-showcase'>
                                <div
                                    ref={wordRef}
                                    className={[
                                        'usage-accent-word',
                                        cursorState !== 'hidden' &&
                                            `usage-accent-cursor-state-${cursorState}`,
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
                                                index === cursorTarget && cursorState !== 'hidden'
                                                    ? ''
                                                    : undefined
                                            }
                                        >
                                            <Kana
                                                accent={currentAccents[index]}
                                                accentPhaseActive
                                                accentVisible
                                                text={kana}
                                                textVisible
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className='usage-guide-copy'>
                            <h3>{t.usageStepEditTitle}</h3>
                            <p>{t.usageStepEditBody}</p>
                        </div>
                    </article>
                    <article className='usage-guide-card usage-reveal-target'>
                        <div
                            className='usage-guide-preview usage-guide-preview-share'
                            aria-hidden='true'
                        >
                            <div className='usage-action-showcase'>
                                <span className='usage-action-icon'>
                                    <Copy size={40} />
                                </span>
                                <span className='usage-action-icon'>
                                    <ImageIcon size={40} />
                                </span>
                                <span className='usage-action-icon'>
                                    <CodeXml size={40} />
                                </span>
                            </div>
                        </div>
                        <div className='usage-guide-copy'>
                            <h3>{t.usageStepShareTitle}</h3>
                            <p>{t.usageStepShareBody}</p>
                        </div>
                    </article>
                </div>
            </div>
        </section>
    );
}
