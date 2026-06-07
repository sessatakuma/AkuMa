import {
    Clipboard,
    CodeXml,
    Copy,
    Dices,
    Keyboard,
    Image as ImageIcon,
} from 'lucide-react';

import './UsageSection.css';

import { useI18n } from '../i18n';

function renderUsageHeading(heading: string) {
    const splitIndex = heading.indexOf('、');

    if (splitIndex === -1) {
        return heading;
    }

    return (
        <>
            <span className='usage-heading-segment'>{heading.slice(0, splitIndex + 1)}</span>
            <span className='usage-heading-segment'>{heading.slice(splitIndex + 1)}</span>
        </>
    );
}

export default function UsageSection() {
    const { t } = useI18n();

    return (
        <section className='usage-section' aria-labelledby='usage-heading'>
            <div className='usage-section-inner'>
                <div className='usage-section-grid'>
                    <div className='usage-section-copy'>
                        <h2 id='usage-heading'>{renderUsageHeading(t.usageHeading)}</h2>
                        <p>{t.usageIntro}</p>
                    </div>
                </div>
                <div className='usage-pitch-primer' aria-labelledby='usage-pitch-heading'>
                    <div className='usage-pitch-copy'>
                        <h3 id='usage-pitch-heading'>{t.usagePitchHeading}</h3>
                        <p>{t.usagePitchIntro}</p>
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
                <div className='usage-guide' aria-label={t.usageHeading}>
                    <article className='usage-guide-card'>
                        <div className='usage-guide-preview usage-guide-preview-start' aria-hidden='true'>
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
                    <article className='usage-guide-card'>
                        <div className='usage-guide-preview usage-guide-preview-edit' aria-hidden='true'>
                            <div className='usage-edit-showcase'>
                                <div className='usage-accent-word'>
                                    <span className='usage-accent-line'></span>
                                    <span className='usage-accent-drop'></span>
                                    <span className='usage-accent-kana'>あ</span>
                                    <span className='usage-accent-kana'>く</span>
                                    <span className='usage-accent-kana'>せ</span>
                                    <span className='usage-accent-kana'>ん</span>
                                    <span className='usage-accent-kana'>と</span>
                                </div>
                            </div>
                        </div>
                        <div className='usage-guide-copy'>
                            <h3>{t.usageStepEditTitle}</h3>
                            <p>{t.usageStepEditBody}</p>
                        </div>
                    </article>
                    <article className='usage-guide-card'>
                        <div className='usage-guide-preview usage-guide-preview-share' aria-hidden='true'>
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
