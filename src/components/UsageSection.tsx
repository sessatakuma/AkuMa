import { useEffect, useRef } from 'react';

import { Clipboard, CodeXml, Copy, Dices, Keyboard, Image as ImageIcon } from 'lucide-react';

import { useI18n } from '../i18n';

import UsageAccentDemo from './UsageAccentDemo';

import './UsageSection.css';

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
                            <UsageAccentDemo />
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
