import { useState, useEffect, forwardRef, useRef } from 'react';

import Kana from 'components/Kana';
import SkeletonLoader from 'components/SkeletonLoader';
import { Copy, Image as ImageIcon, ArrowDownToLine, CodeXml, Moon } from 'lucide-react';
import {
    cloneWords,
    getAccentArray,
    getAccentNumberFromArray,
    getReadingFromFurigana,
} from 'utilities/accent';
import isKana from 'utilities/isKana';
import { isKanaReading, splitKanaSyllables } from 'utilities/kanaUtils';
import { placeholder } from 'utilities/placeholder';
import { AccentValue, type AccentValueType, type Word } from 'utilities/types';

import 'components/Result.css';
import markdownExportStyles from '../../hackMD.css?raw';

const preloadExportModules = (() => {
    type ExportModules = {
        toPng: typeof import('html-to-image').toPng;
    };
    let cache: Promise<ExportModules> | null = null;
    return () =>
        (cache ??= Promise.all([import('html-to-image')]).then(
            ([htmlToImage]) => ({
                toPng: htmlToImage.toPng,
            }),
        ));
})();

interface ResultProps {
    words: Word[];
    updateWords: (updater: Word[] | ((current: Word[]) => Word[])) => void;
    isLoading: boolean;
    canUndo: boolean;
    canRedo: boolean;
    onUndo: () => void;
    onRedo: () => void;
    onEditingChange: (isEditing: boolean) => void;
}

type FeedbackType = 'success' | 'warning';
const EXPORT_PADDING_PX = 32;

function getSurfaceSegments(word: Word): string[] {
    return isKana(word.surface) && Array.isArray(word.accent)
        ? splitKanaSyllables(word.surface)
        : [...word.surface];
}

function escapeHtml(value: string): string {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function renderMarkdownSyllable(text: string, accent: AccentValueType): string {
    const escapedText = escapeHtml(text);
    if (accent === AccentValue.High) return `<i>${escapedText}</i>`;
    if (accent === AccentValue.Drop) return `<b>${escapedText}</b>`;
    return escapedText;
}

function buildMarkdownExport(words: Word[]): string {
    const rubyMarkup = words
        .map(word => {
            const surfaceSegments = getSurfaceSegments(word);
            const kanaAccents = isKana(word.surface) && Array.isArray(word.accent) ? word.accent : null;
            const baseMarkup = escapeHtml(word.surface);

            const readingMarkup = (kanaAccents
                ? surfaceSegments.map((segment, index) =>
                      renderMarkdownSyllable(segment, kanaAccents[index] ?? AccentValue.None),
                  )
                : word.furigana.map(item =>
                      renderMarkdownSyllable(
                          item.text === placeholder ? '' : item.text,
                          item.accent,
                      ),
                  )
            ).join('');

            return `<ruby>${baseMarkup}<rt>${readingMarkup}</rt></ruby>`;
        })
        .join('');

    return `<style>${markdownExportStyles.trim()}</style><div class="accent-marker">${rubyMarkup}</div>`;
}

const Result = forwardRef<HTMLDivElement, ResultProps>(
    ({ words, updateWords, isLoading, onEditingChange }, ref) => {
        const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
        const [feedbackType, setFeedbackType] = useState<FeedbackType>('success');
        const [isDarkResult, setIsDarkResult] = useState(false);
        const [isMenuOpen, setIsMenuOpen] = useState(false);
        const [showAccent, setShowAccent] = useState(true);

        const resultRef = useRef<HTMLParagraphElement>(null);
        const isEmpty = !words || words.length === 0;

        const showFeedback = (message: string, type: FeedbackType): void => {
            setFeedbackType(type);
            setCopyFeedback(message);
            window.setTimeout(() => {
                setCopyFeedback(current => (current === message ? null : current));
            }, 2000);
        };

        const downloadMarkdown = (): void => {
            if (isEmpty) return;

            const markdownDocument = buildMarkdownExport(words);
            const blob = new Blob([markdownDocument], { type: 'text/markdown;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.download = 'accented-text.md';
            link.href = url;
            link.click();
            window.setTimeout(() => URL.revokeObjectURL(url), 0);
            showFeedback('Markdownを書き出しました！', 'success');
        };

        const downloadImage = async (): Promise<void> => {
            if (resultRef.current === null || isEmpty) return;

            const bgColor = isDarkResult ? '#1F2937' : '#FFFFFF';
            const element = resultRef.current;
            const width = element.offsetWidth + EXPORT_PADDING_PX * 2;
            const height = element.offsetHeight + EXPORT_PADDING_PX * 2;
            const { toPng } = await preloadExportModules();
            toPng(element, {
                backgroundColor: bgColor,
                pixelRatio: 2,
                width,
                height,
                style: {
                    boxSizing: 'border-box',
                    margin: '0',
                    padding: `${EXPORT_PADDING_PX}px`,
                },
            })
                .then(dataUrl => {
                    const link = document.createElement('a');
                    link.download = 'accented-text.png';
                    link.href = dataUrl;
                    link.click();
                })
                .catch(err => {
                    console.error('画像の生成に失敗しました', err);
                });
        };

        const updateKana = (
            wordIndex: number,
            textIndex: number,
            newAccent: AccentValueType,
        ): void => {
            updateWords(currentWords => {
                const nextWords = cloneWords(currentWords);
                const word = nextWords[wordIndex];
                if (word && Array.isArray(word.accent)) {
                    word.accent[textIndex] = newAccent;
                }
                return nextWords;
            });
        };

        const updateFurigana = (
            wordIndex: number,
            textIndex: number,
            newFurigana: string,
            newAccent: AccentValueType,
        ): void => {
            const trimmed = newFurigana.trim();

            if (trimmed !== '' && !isKanaReading(trimmed)) {
                showFeedback('ふりがなにはかなのみ入力できます', 'warning');
                return;
            }

            updateWords(currentWords => {
                const nextWords = cloneWords(currentWords);
                const word = nextWords[wordIndex];
                if (!word || !word.furigana[textIndex]) {
                    return currentWords;
                }

                if (newFurigana === placeholder || trimmed === '') {
                    if (word.furigana.length === 1) {
                        word.furigana[textIndex].text = placeholder;
                        word.furigana[textIndex].accent = AccentValue.None;
                    } else {
                        word.furigana.splice(textIndex, 1);
                    }
                    return nextWords;
                }

                const syllables = splitKanaSyllables(trimmed);
                if (syllables.length === 1) {
                    word.furigana[textIndex].text = trimmed;
                    word.furigana[textIndex].accent = newAccent;
                    return nextWords;
                }

                word.furigana.splice(
                    textIndex,
                    1,
                    ...syllables.map((text, index) => ({
                        text,
                        accent: index === 0 ? newAccent : AccentValue.None,
                    })),
                );
                return nextWords;
            });
        };

        const copyPlainText = (): void => {
            if (isEmpty) return;

            const content = words
                .map(word => {
                    const accentIndex = getAccentNumberFromArray(getAccentArray(word));
                    const reading = getReadingFromFurigana(word.furigana)
                        .replaceAll(placeholder, '')
                        .trim();

                    if (reading.length > 0 && word.surface !== reading) {
                        return `${word.surface}（${reading}｜${accentIndex}）`;
                    }

                    return `${word.surface}（${accentIndex}）`;
                })
                .join('');

            navigator.clipboard
                .writeText(content)
                .then(() => showFeedback('コピーしました！', 'success'))
                .catch(err => {
                    console.error('コピー失敗', err);
                    showFeedback('コピーに失敗しました', 'warning');
                });
        };

        useEffect(() => {
            if (!isEmpty) {
                preloadExportModules();
            }
        }, [isEmpty]);

        useEffect(() => {
            if (!isMenuOpen) return;
            const handleClickOutside = (event: globalThis.MouseEvent): void => {
                const target = event.target as HTMLElement;
                if (!target.closest('.save-menu-container')) {
                    setIsMenuOpen(false);
                }
            };
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }, [isMenuOpen]);

        let content: React.ReactNode;
        if (isLoading) {
            content = <SkeletonLoader lines={5} />;
        } else if (isEmpty) {
            content = (
                <div className='empty-state'>
                    <p>結果</p>
                </div>
            );
        } else {
            content = (
                <p
                    className={`result-area ${showAccent ? '' : 'result-area-hide-accent'}`.trim()}
                    ref={resultRef}
                >
                    {words.map((word, wordIndex) => {
                        const surfaceSegments = getSurfaceSegments(word);
                        const kanaWord = isKana(word.surface);
                        const kanaAccents = Array.isArray(word.accent) ? word.accent : null;

                        if (kanaWord && kanaAccents) {
                            return (
                                <span key={`${wordIndex}-${word.surface}`}>
                                    {surfaceSegments.map((segment, charIndex) => (
                                        <ruby
                                            key={`${wordIndex}-${charIndex}`}
                                            className='kana-only-ruby'
                                        >
                                            <span className='kana-only-base'>{segment}</span>
                                            <rt>
                                                <Kana
                                                    text={segment}
                                                    ghost
                                                    accent={
                                                        kanaAccents[charIndex] ?? AccentValue.None
                                                    }
                                                    onUpdate={(_ignore, newAccent) =>
                                                        updateKana(wordIndex, charIndex, newAccent)
                                                    }
                                                />
                                            </rt>
                                        </ruby>
                                    ))}
                                </span>
                            );
                        }

                        return (
                            <ruby key={`${wordIndex}-${word.surface}`}>
                                {surfaceSegments.map((segment, charIndex) => (
                                    <span key={`${wordIndex}-${charIndex}`}>{segment}</span>
                                ))}
                                <rt>
                                    {word.furigana.map((char, charIndex) => (
                                        <Kana
                                            key={`${wordIndex}-${charIndex}`}
                                            editable
                                            text={char.text === placeholder ? '' : char.text}
                                            accent={char.accent}
                                            onUpdate={(newText, newAccent) =>
                                                updateFurigana(
                                                    wordIndex,
                                                    charIndex,
                                                    newText,
                                                    newAccent,
                                                )
                                            }
                                            onFocusChange={onEditingChange}
                                        />
                                    ))}
                                </rt>
                            </ruby>
                        );
                    })}
                </p>
            );
        }

        return (
            <div
                className={`result-container-inner ${isDarkResult ? 'dark-result' : ''} ${
                    isEmpty ? 'tone-down' : ''
                }`}
                ref={ref}
            >
                <div className='result-content'>{content}</div>

                {!isEmpty && (
                    <div className='result-actions'>
                        <div className='action-group-left'>
                            {copyFeedback && (
                                <div className={`toast-notification toast-${feedbackType}`}>
                                    {copyFeedback}
                                </div>
                            )}
                            <label className='accent-toggle' htmlFor='show-accent-toggle'>
                                <span className='accent-toggle-label'>アクセント表示</span>
                                <span className='switch'>
                                    <input
                                        id='show-accent-toggle'
                                        type='checkbox'
                                        checked={showAccent}
                                        onChange={() => setShowAccent(prev => !prev)}
                                    />
                                    <span className='slider'></span>
                                </span>
                            </label>
                        </div>

                        <div className='action-group-right'>
                            <button
                                className='action-button'
                                onClick={copyPlainText}
                                title='テキスト形式でコピー'
                            >
                                <Copy size={18} />
                            </button>

                            <div className='save-menu-container'>
                                <button
                                    className={`action-button save-menu-trigger ${
                                        isMenuOpen ? 'active' : ''
                                    }`}
                                    onClick={() => setIsMenuOpen(prev => !prev)}
                                    title='保存オプション'
                                >
                                    <ArrowDownToLine size={18} />
                                </button>

                                {isMenuOpen && (
                                    <div className='save-menu-dropdown'>
                                        <div className='theme-switch-container'>
                                            <Moon size={16} className='theme-switch-label' />
                                            <label className='switch'>
                                                <input
                                                    type='checkbox'
                                                    checked={isDarkResult}
                                                    onChange={() => setIsDarkResult(prev => !prev)}
                                                />
                                                <span className='slider'></span>
                                            </label>
                                        </div>
                                        <div className='menu-divider'></div>
                                        <button
                                            className='menu-item'
                                            onClick={() => {
                                                downloadImage();
                                                setIsMenuOpen(false);
                                            }}
                                        >
                                            <ImageIcon size={16} />
                                            <span>画像</span>
                                        </button>
                                        <button
                                            className='menu-item'
                                            onClick={() => {
                                                downloadMarkdown();
                                                setIsMenuOpen(false);
                                            }}
                                        >
                                            <CodeXml size={16} />
                                            <span>Markdown</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    },
);

Result.displayName = 'Result';

export default Result;
