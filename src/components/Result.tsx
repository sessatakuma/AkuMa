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
    statusMessage: string;
}

type FeedbackType = 'success' | 'warning';
const EXPORT_PADDING_PX = 32;
type FocusPlacement = 'start' | 'end';

interface PendingFocusTarget {
    wordIndex: number;
    textIndex: number;
    placement: FocusPlacement;
}

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

function buildMarkdownExport(words: Word[], showAccent: boolean): string {
    const rubyMarkup = words
        .map(word => {
            const surfaceSegments = getSurfaceSegments(word);
            const kanaAccents = isKana(word.surface) && Array.isArray(word.accent) ? word.accent : null;
            const baseMarkup = escapeHtml(word.surface);

            const readingMarkup = (kanaAccents
                ? surfaceSegments.map((segment, index) =>
                      showAccent
                          ? renderMarkdownSyllable(
                                segment,
                                kanaAccents[index] ?? AccentValue.None,
                            )
                          : escapeHtml(segment),
                  )
                : word.furigana.map(item =>
                      showAccent
                          ? renderMarkdownSyllable(
                                item.text === placeholder ? '' : item.text,
                                item.accent,
                            )
                          : escapeHtml(item.text === placeholder ? '' : item.text),
                  )
            ).join('');

            return `<ruby>${baseMarkup}<rt>${readingMarkup}</rt></ruby>`;
        })
        .join('');

    return `<style>${markdownExportStyles.trim()}</style><div class="accent-marker">${rubyMarkup}</div>`;
}

const Result = forwardRef<HTMLDivElement, ResultProps>(
    ({ words, updateWords, isLoading, onEditingChange, statusMessage }, ref) => {
        const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
        const [feedbackType, setFeedbackType] = useState<FeedbackType>('success');
        const [isDarkResult, setIsDarkResult] = useState(false);
        const [isMenuOpen, setIsMenuOpen] = useState(false);
        const [showAccent, setShowAccent] = useState(true);

        const resultRef = useRef<HTMLParagraphElement>(null);
        const pendingFocusRef = useRef<PendingFocusTarget | null>(null);
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

            const markdownDocument = buildMarkdownExport(words, showAccent);
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

        const focusEditableKana = (
            wordIndex: number,
            textIndex: number,
            placement: FocusPlacement,
        ): void => {
            pendingFocusRef.current = { wordIndex, textIndex, placement };
        };

        const setCaretPosition = (element: HTMLElement, placement: FocusPlacement): void => {
            const selection = window.getSelection();
            if (!selection) return;

            const range = document.createRange();
            range.selectNodeContents(element);
            range.collapse(placement === 'start');
            selection.removeAllRanges();
            selection.addRange(range);
            element.focus();
        };

        const deleteBackwardAcrossFurigana = (wordIndex: number, textIndex: number, currentText: string): boolean => {
            if (textIndex <= 0) {
                return false;
            }

            let handled = false;

            updateWords(currentWords => {
                const nextWords = cloneWords(currentWords);
                const word = nextWords[wordIndex];
                if (!word || !word.furigana[textIndex - 1] || !word.furigana[textIndex]) {
                    return currentWords;
                }

                const isCurrentEmpty = currentText.length === 0;
                if (isCurrentEmpty && word.furigana.length <= 1) {
                    return currentWords;
                }

                const previousIndex = textIndex - 1;
                const previousItem = word.furigana[previousIndex];
                const previousUnits = splitKanaSyllables(previousItem.text.replaceAll(placeholder, '').trim());
                if (previousUnits.length === 0) {
                    return currentWords;
                }

                handled = true;

                const nextPreviousText = previousUnits.slice(0, -1).join('');
                if (nextPreviousText.length === 0) {
                    if (word.furigana.length - (isCurrentEmpty ? 1 : 0) <= 1) {
                        previousItem.text = placeholder;
                        previousItem.accent = AccentValue.None;
                    } else {
                        word.furigana.splice(previousIndex, 1);
                    }
                } else {
                    previousItem.text = nextPreviousText;
                }

                let focusIndex = textIndex;
                if (isCurrentEmpty) {
                    const currentIndex = word.furigana[previousIndex] === previousItem ? textIndex : textIndex - 1;
                    if (word.furigana[currentIndex]) {
                        word.furigana.splice(currentIndex, 1);
                    }
                    focusIndex = Math.max(0, currentIndex - 1);
                } else if (!word.furigana[previousIndex] || word.furigana[previousIndex] !== previousItem) {
                    focusIndex = textIndex - 1;
                }

                const boundedFocusIndex = Math.min(focusIndex, word.furigana.length - 1);
                if (word.furigana[boundedFocusIndex]) {
                    focusEditableKana(
                        wordIndex,
                        boundedFocusIndex,
                        isCurrentEmpty ? 'end' : 'start',
                    );
                }

                return nextWords;
            });

            return handled;
        };

        const copyPlainText = (): void => {
            if (isEmpty) return;

            const content = words
                .map(word => {
                    const accentIndex = getAccentNumberFromArray(getAccentArray(word));
                    const reading = getReadingFromFurigana(word.furigana)
                        .replaceAll(placeholder, '')
                        .trim();

                    if (!showAccent) {
                        if (reading.length > 0 && word.surface !== reading) {
                            return `${word.surface}（${reading}）`;
                        }

                        return word.surface;
                    }

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
            const pendingFocus = pendingFocusRef.current;
            if (!pendingFocus) return;

            pendingFocusRef.current = null;
            window.requestAnimationFrame(() => {
                const target = resultRef.current?.querySelector<HTMLElement>(
                    `.kana-text[data-word-index="${pendingFocus.wordIndex}"][data-text-index="${pendingFocus.textIndex}"]`,
                );
                if (target) {
                    setCaretPosition(target, pendingFocus.placement);
                }
            });
        }, [words]);

        useEffect(() => {
            if (!isMenuOpen) return;
            const handleClickOutside = (event: globalThis.MouseEvent): void => {
                const target = event.target as HTMLElement;
                if (!target.closest('.save-menu-container')) {
                    setIsMenuOpen(false);
                }
            };
            const handleKeyDown = (event: KeyboardEvent): void => {
                if (event.key === 'Escape') {
                    setIsMenuOpen(false);
                }
            };
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleKeyDown);
            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
                document.removeEventListener('keydown', handleKeyDown);
            };
        }, [isMenuOpen]);

        let content: React.ReactNode;
        if (isLoading) {
            content = <SkeletonLoader lines={5} />;
        } else if (isEmpty) {
            content = (
                <div className='empty-state' role='status' aria-live='polite'>
                    <p>結果</p>
                </div>
            );
        } else {
            content = (
                <div
                    id='accent-result-output'
                    className={`result-area ${showAccent ? '' : 'result-area-hide-accent'}`.trim()}
                    ref={resultRef}
                    role='region'
                    aria-live='polite'
                    aria-label='アクセント解析結果'
                    lang='ja'
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
                                            textIndex={charIndex}
                                            wordIndex={wordIndex}
                                            onBackspaceAtStart={currentText =>
                                                deleteBackwardAcrossFurigana(
                                                    wordIndex,
                                                    charIndex,
                                                    currentText,
                                                )
                                            }
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
                </div>
            );
        }

        return (
            <div
                className={`result-container-inner ${isDarkResult ? 'dark-result' : ''} ${
                    isEmpty ? 'tone-down' : ''
                }`}
                ref={ref}
            >
                <p className='visually-hidden' aria-live='polite'>
                    {statusMessage}
                </p>
                <div className='result-content'>{content}</div>

                {!isEmpty && (
                    <div className='result-actions' aria-label='結果の操作'>
                        <div className='action-group-left'>
                            {copyFeedback && (
                                <div
                                    className={`toast-notification toast-${feedbackType}`}
                                    role='status'
                                    aria-live='polite'
                                >
                                    {copyFeedback}
                                </div>
                            )}
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
                            <button
                                className='action-button'
                                onClick={copyPlainText}
                                title='テキスト形式でコピー'
                                aria-label='テキスト形式でコピー'
                                type='button'
                            >
                                <Copy size={18} />
                            </button>

                            <div className='save-menu-container'>
                                <button
                                    id='save-menu-trigger'
                                    className={`action-button save-menu-trigger ${
                                        isMenuOpen ? 'active' : ''
                                    }`}
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
                                        <button
                                            className='menu-item'
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
                                        <div className='theme-switch-container'>
                                            <Moon size={16} className='theme-switch-label' />
                                            <label className='switch'>
                                                <input
                                                    type='checkbox'
                                                    checked={isDarkResult}
                                                    onChange={() =>
                                                        setIsDarkResult(prev => !prev)
                                                    }
                                                    aria-label='結果プレビューをダークテーマに切り替え'
                                                />
                                                <span className='slider'></span>
                                            </label>
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
                )}
            </div>
        );
    },
);

Result.displayName = 'Result';

export default Result;
