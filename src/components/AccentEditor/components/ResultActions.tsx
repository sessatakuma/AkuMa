import {
    ArrowDownToLine,
    CodeXml,
    Copy,
    Image as ImageIcon,
    Moon,
    RotateCcw,
    Sun,
} from 'lucide-react';

import { useI18n } from '../../../i18n';

type FeedbackType = 'success' | 'warning';

interface ResultActionsProps {
    copyFeedback: string | null;
    canRestore: boolean;
    downloadHtml: () => void;
    copyPlainText: () => void;
    downloadImage: () => void;
    feedbackType: FeedbackType;
    isExpanded: boolean;
    isDarkResult: boolean;
    isMenuOpen: boolean;
    onRequestRestoreAll: () => void;
    onToggleExpanded: () => void;
    setIsDarkResult: React.Dispatch<React.SetStateAction<boolean>>;
    setIsMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
    setShowAccent: React.Dispatch<React.SetStateAction<boolean>>;
    showAccent: boolean;
}

export default function ResultActions({
    copyFeedback,
    copyPlainText,
    canRestore,
    downloadHtml,
    downloadImage,
    feedbackType,
    isExpanded,
    isDarkResult,
    isMenuOpen,
    onRequestRestoreAll,
    onToggleExpanded,
    setIsDarkResult,
    setIsMenuOpen,
    setShowAccent,
    showAccent,
}: ResultActionsProps) {
    const { t } = useI18n();

    return (
        <div className='result-actions' aria-label={t.resultActions}>
            <div className='action-group-left'>
                <label className='accent-toggle' htmlFor='show-accent-toggle'>
                    <span className='accent-toggle-label'>{t.accentToggle}</span>
                    <span className='switch'>
                        <input
                            id='show-accent-toggle'
                            type='checkbox'
                            checked={showAccent}
                            onChange={() => setShowAccent(prev => !prev)}
                            aria-controls='accent-result-output'
                        />
                        <span className='slider'></span>
                    </span>
                </label>
            </div>

            <div className='action-group-right' aria-label={t.saveAndCopy}>
                <div className='copy-action-container'>
                    {copyFeedback && (
                        <div
                            className={`toast-notification toast-${feedbackType}`}
                            role='status'
                            aria-live='polite'
                        >
                            {copyFeedback}
                        </div>
                    )}
                    <button
                        className='action-button'
                        onClick={copyPlainText}
                        title={t.copyAsText}
                        aria-label={t.copyAsText}
                        type='button'
                    >
                        <Copy size={18} />
                    </button>
                </div>

                <button
                    className='action-button'
                    onClick={onRequestRestoreAll}
                    title={t.restoreAllEdits}
                    aria-label={t.restoreAllEdits}
                    type='button'
                    disabled={!canRestore}
                >
                    <RotateCcw size={18} />
                </button>

                <div className='save-menu-container'>
                    <button
                        id='save-menu-trigger'
                        className={`action-button save-menu-trigger ${isMenuOpen ? 'active' : ''}`}
                        onClick={() => setIsMenuOpen(prev => !prev)}
                        title={t.exportOptions}
                        aria-label={t.exportOptions}
                        aria-haspopup='menu'
                        aria-expanded={isMenuOpen}
                        aria-controls='save-menu'
                        type='button'
                    >
                        <ArrowDownToLine size={18} />
                    </button>

                    {isMenuOpen && (
                        <div
                            id='save-menu'
                            className='save-menu-dropdown'
                            role='menu'
                            aria-labelledby='save-menu-trigger'
                        >
                            <div className='menu-inline-row'>
                                <button
                                    className='menu-item menu-item-inline'
                                    onClick={() => {
                                        downloadImage();
                                        setIsMenuOpen(false);
                                    }}
                                    role='menuitem'
                                    type='button'
                                >
                                    <ImageIcon size={16} />
                                    <span>{t.exportImage}</span>
                                </button>
                                <button
                                    type='button'
                                    className='theme-pill-button theme-pill-button-single'
                                    onClick={() => setIsDarkResult(prev => !prev)}
                                    aria-pressed={isDarkResult}
                                    aria-label={t.toggleImageTheme(isDarkResult)}
                                    title={t.toggleImageTheme(isDarkResult)}
                                >
                                    {isDarkResult ? <Moon size={18} /> : <Sun size={18} />}
                                </button>
                            </div>
                            <div className='menu-divider'></div>
                            <button
                                className='menu-item'
                                onClick={() => {
                                    downloadHtml();
                                    setIsMenuOpen(false);
                                }}
                                role='menuitem'
                                type='button'
                            >
                                <CodeXml size={16} />
                                <span>{t.exportHtml}</span>
                            </button>
                        </div>
                    )}
                </div>

                <button
                    className='action-button action-button-expand'
                    onClick={onToggleExpanded}
                    title={isExpanded ? t.collapseResult : t.expandResult}
                    aria-label={isExpanded ? t.collapseResult : t.expandResult}
                    type='button'
                >
                    {isExpanded ? (
                        <svg
                            xmlns='http://www.w3.org/2000/svg'
                            width='24'
                            height='24'
                            viewBox='0 0 24 24'
                            fill='none'
                            stroke='currentColor'
                            strokeWidth='2'
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            aria-hidden='true'
                        >
                            <path d='M8 3v3a2 2 0 0 1-2 2H3' />
                            <path d='M21 8h-3a2 2 0 0 1-2-2V3' />
                            <path d='M3 16h3a2 2 0 0 1 2 2v3' />
                            <path d='M16 21v-3a2 2 0 0 1 2-2h3' />
                        </svg>
                    ) : (
                        <svg
                            xmlns='http://www.w3.org/2000/svg'
                            width='24'
                            height='24'
                            viewBox='0 0 24 24'
                            fill='none'
                            stroke='currentColor'
                            strokeWidth='2'
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            aria-hidden='true'
                        >
                            <path d='M8 3H5a2 2 0 0 0-2 2v3' />
                            <path d='M21 8V5a2 2 0 0 0-2-2h-3' />
                            <path d='M3 16v3a2 2 0 0 0 2 2h3' />
                            <path d='M16 21h3a2 2 0 0 0 2-2v-3' />
                        </svg>
                    )}
                </button>
            </div>
        </div>
    );
}
