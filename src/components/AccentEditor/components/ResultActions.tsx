import {
    ArrowDownToLine,
    CodeXml,
    Copy,
    Image as ImageIcon,
    Moon,
    Sun,
} from 'lucide-react';

type FeedbackType = 'success' | 'warning';

interface ResultActionsProps {
    copyFeedback: string | null;
    copyPlainText: () => void;
    downloadImage: () => void;
    downloadMarkdown: () => void;
    feedbackType: FeedbackType;
    isDarkResult: boolean;
    isMenuOpen: boolean;
    setIsDarkResult: React.Dispatch<React.SetStateAction<boolean>>;
    setIsMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
    setShowAccent: React.Dispatch<React.SetStateAction<boolean>>;
    showAccent: boolean;
}

export default function ResultActions({
    copyFeedback,
    copyPlainText,
    downloadImage,
    downloadMarkdown,
    feedbackType,
    isDarkResult,
    isMenuOpen,
    setIsDarkResult,
    setIsMenuOpen,
    setShowAccent,
    showAccent,
}: ResultActionsProps) {
    return (
        <div className='result-actions' aria-label='結果の操作'>
            <div className='action-group-left'>
                <label className='accent-toggle' htmlFor='show-accent-toggle'>
                    <span className='accent-toggle-label'>アクセント</span>
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

            <div className='action-group-right' aria-label='書き出しとコピー'>
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
                        title='テキスト形式でコピー'
                        aria-label='テキスト形式でコピー'
                        type='button'
                    >
                        <Copy size={18} />
                    </button>
                </div>

                <div className='save-menu-container'>
                    <button
                        id='save-menu-trigger'
                        className={`action-button save-menu-trigger ${isMenuOpen ? 'active' : ''}`}
                        onClick={() => setIsMenuOpen(prev => !prev)}
                        title='保存オプション'
                        aria-label='保存オプションを開く'
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
                                    <span>画像</span>
                                </button>
                                <button
                                    type='button'
                                    className='theme-pill-button theme-pill-button-single'
                                    onClick={() => setIsDarkResult(prev => !prev)}
                                    aria-pressed={isDarkResult}
                                    aria-label={`画像テーマを${isDarkResult ? 'ライト' : 'ダーク'}に切り替え`}
                                    title={`画像テーマを${isDarkResult ? 'ライト' : 'ダーク'}に切り替え`}
                                >
                                    {isDarkResult ? <Moon size={18} /> : <Sun size={18} />}
                                </button>
                            </div>
                            <div className='menu-divider'></div>
                            <button
                                className='menu-item'
                                onClick={() => {
                                    downloadMarkdown();
                                    setIsMenuOpen(false);
                                }}
                                role='menuitem'
                                type='button'
                            >
                                <CodeXml size={16} />
                                <span>Markdown</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
