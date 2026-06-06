import {
    ArrowDownToLine,
    ArrowLeftRight,
    ArrowUpDown,
    Clipboard,
    CodeXml,
    Copy,
    Dices,
    Image as ImageIcon,
    Moon,
    PencilLine,
    WandSparkles,
} from 'lucide-react';

import './UsageSection.css';

import { useI18n } from '../i18n';

export default function UsageSection() {
    const { t } = useI18n();

    return (
        <section className='usage-section' aria-labelledby='usage-heading'>
            <div className='usage-section-inner'>
                <div className='usage-section-grid'>
                    <div className='usage-section-copy'>
                        <h2 id='usage-heading'>{t.usageHeading}</h2>
                        <p>{t.usageIntro}</p>
                    </div>
                </div>
                <div className='usage-guide' aria-label={t.usageHeading}>
                    <article className='usage-guide-card'>
                        <div className='usage-guide-preview usage-guide-preview-start' aria-hidden='true'>
                            <p className='usage-guide-meta'>
                                <WandSparkles size={16} />
                                <span>{t.usageStepStartHint}</span>
                            </p>
                            <div className='input-panel usage-guide-preview-panel'>
                                <div className='input-section'>
                                    <div className='input-area usage-guide-input-area'>
                                        <span className='usage-guide-line usage-guide-line-strong' />
                                        <span className='usage-guide-line' />
                                        <span className='usage-guide-line usage-guide-line-short' />
                                    </div>
                                    <div className='input-actions'>
                                        <button className='paste-button usage-guide-preview-button' type='button' tabIndex={-1}>
                                            <Clipboard size={18} />
                                        </button>
                                        <button className='generate-button usage-guide-preview-button' type='button' tabIndex={-1}>
                                            <span className='generate-button-icon'>
                                                <Dices size={18} />
                                            </span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className='usage-guide-copy'>
                            <h3>{t.usageStepStartTitle}</h3>
                            <p>{t.usageStepStartBody}</p>
                        </div>
                    </article>
                    <article className='usage-guide-card'>
                        <div className='usage-guide-preview usage-guide-preview-furigana' aria-hidden='true'>
                            <p className='usage-guide-meta'>
                                <PencilLine size={16} />
                                <span>{t.usageStepFuriganaHint}</span>
                            </p>
                            <div className='result-panel usage-guide-preview-panel'>
                                <div className='result-container-inner usage-guide-preview-result-shell'>
                                    <div className='result-content usage-guide-preview-result-content'>
                                        <div className='result-area usage-guide-result-area'>
                                            <div className='word-reading-row usage-guide-reading-row'>
                                                {['ふ', 'り', 'が', 'な'].map(kana => (
                                                    <span key={kana} className='word-reading-cell usage-guide-reading-cell'>
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
                                                                {kana}
                                                            </span>
                                                        </span>
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className='usage-guide-arrow-row'>
                                <ArrowLeftRight size={18} />
                            </div>
                        </div>
                        <div className='usage-guide-copy'>
                            <h3>{t.usageStepFuriganaTitle}</h3>
                            <p>{t.usageStepFuriganaBody}</p>
                        </div>
                    </article>
                    <article className='usage-guide-card'>
                        <div className='usage-guide-preview usage-guide-preview-accent' aria-hidden='true'>
                            <p className='usage-guide-meta'>
                                <ArrowUpDown size={16} />
                                <span>{t.usageStepAccentHint}</span>
                            </p>
                            <div className='result-panel usage-guide-preview-panel'>
                                <div className='result-container-inner dark-result usage-guide-preview-result-shell'>
                                    <div className='result-content usage-guide-preview-result-content'>
                                        <div className='result-area usage-guide-result-area'>
                                            <div className='word-reading-row usage-guide-reading-row'>
                                                {['あ', 'く', 'せ', 'ん', 'と'].map((kana, index) => (
                                                    <span key={kana} className='word-reading-cell usage-guide-reading-cell'>
                                                        <span
                                                            className='kana-shell'
                                                            data-accent={index === 4 ? 'drop' : 'flat'}
                                                            data-accent-phase-active='true'
                                                            data-accent-visible='true'
                                                        >
                                                            <span className='kana-accent-lane'>
                                                                <span className='kana-accent-line'></span>
                                                                {index === 4 ? <span className='kana-accent-drop'></span> : null}
                                                            </span>
                                                            <span className='kana-text' data-text-visible='true'>
                                                                {kana}
                                                            </span>
                                                        </span>
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className='usage-guide-arrow-column'>
                                <ArrowUpDown size={18} />
                            </div>
                        </div>
                        <div className='usage-guide-copy'>
                            <h3>{t.usageStepAccentTitle}</h3>
                            <p>{t.usageStepAccentBody}</p>
                        </div>
                    </article>
                    <article className='usage-guide-card'>
                        <div className='usage-guide-preview usage-guide-preview-share' aria-hidden='true'>
                            <p className='usage-guide-meta'>
                                <ArrowDownToLine size={16} />
                                <span>{t.usageStepShareHint}</span>
                            </p>
                            <div className='result-panel usage-guide-preview-panel'>
                                <div className='result-container-inner dark-result usage-guide-preview-result-shell'>
                                    <div className='result-content usage-guide-preview-share-spacer'></div>
                                    <div className='result-actions'>
                                    <div className='action-group-left'>
                                            <label className='accent-toggle'>
                                                <span className='accent-toggle-label'>{t.accentToggle}</span>
                                                <span className='switch'>
                                                    <input type='checkbox' checked readOnly />
                                                    <span className='slider'></span>
                                                </span>
                                            </label>
                                    </div>
                                    <div className='action-group-right'>
                                            <div className='copy-action-container'>
                                                <button className='action-button' type='button' tabIndex={-1}>
                                                    <Copy size={18} />
                                                </button>
                                            </div>
                                            <div className='save-menu-container'>
                                                <button
                                                    className='action-button save-menu-trigger active'
                                                    type='button'
                                                    tabIndex={-1}
                                                >
                                                <ArrowDownToLine size={18} />
                                                </button>
                                                <div className='save-menu-dropdown'>
                                                    <div className='menu-inline-row'>
                                                        <button
                                                            className='menu-item menu-item-inline'
                                                            type='button'
                                                            tabIndex={-1}
                                                        >
                                                            <ImageIcon size={16} />
                                                            <span>{t.exportImage}</span>
                                                        </button>
                                                        <button
                                                            type='button'
                                                            className='theme-pill-button theme-pill-button-single'
                                                            tabIndex={-1}
                                                        >
                                                            <Moon size={18} />
                                                        </button>
                                                    </div>
                                                    <div className='menu-divider'></div>
                                                    <button className='menu-item' type='button' tabIndex={-1}>
                                                        <CodeXml size={16} />
                                                        <span>{t.exportHtml}</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
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
