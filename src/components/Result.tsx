import { useState, useEffect, forwardRef, useRef } from 'react';

import Kana from 'components/Kana';
import SkeletonLoader from 'components/SkeletonLoader';
import { Copy, Image as ImageIcon, FileText, ArrowDownToLine, CodeXml, Moon } from 'lucide-react';
import { cloneWords, getAccentArray, getAccentNumberFromArray, getReadingFromFurigana } from 'utilities/accent';
import isKana from 'utilities/isKana';
import { isKanaReading, splitKanaSyllables } from 'utilities/kanaUtils';
import { placeholder } from 'utilities/placeholder';
import { AccentValue, type AccentValueType, type Word } from 'utilities/types';

import 'components/Result.css';

const preloadExportModules = (() => {
    type ExportModules = {
        toPng: typeof import('html-to-image').toPng;
        jsPDF: typeof import('jspdf').default;
    };
    let cache: Promise<ExportModules> | null = null;
    return () =>
        (cache ??= Promise.all([import('html-to-image'), import('jspdf')]).then(
            ([htmlToImage, jspdf]) => ({
                toPng: htmlToImage.toPng,
                jsPDF: jspdf.default,
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

function getSurfaceSegments(word: Word): string[] {
    return isKana(word.surface) && Array.isArray(word.accent)
        ? splitKanaSyllables(word.surface)
        : [...word.surface];
}

const Result = forwardRef<HTMLDivElement, ResultProps>(
    ({ words, updateWords, isLoading, onEditingChange }, ref) => {
        const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
        const [feedbackType, setFeedbackType] = useState<FeedbackType>('success');
        const [isDarkResult, setIsDarkResult] = useState(false);
        const [isMenuOpen, setIsMenuOpen] = useState(false);

        const resultRef = useRef<HTMLParagraphElement>(null);
        const isEmpty = !words || words.length === 0;

        const showFeedback = (message: string, type: FeedbackType): void => {
            setFeedbackType(type);
            setCopyFeedback(message);
            window.setTimeout(() => {
                setCopyFeedback(current => (current === message ? null : current));
            }, 2000);
        };

        const copyResult = (): void => {
            if (isEmpty) return;

            const content = words
                .map(word => {
                    if (isKana(word.surface) && Array.isArray(word.accent)) {
                        const accentArray = word.accent;
                        return getSurfaceSegments(word)
                            .map((segment, index) => {
                                const accent = accentArray[index] ?? AccentValue.None;
                                if (accent === AccentValue.High) return `<i>${segment}</i>`;
                                if (accent === AccentValue.Drop) return `<b>${segment}</b>`;
                                return segment;
                            })
                            .join('');
                    }

                    const furigana = word.furigana
                        .map(item => {
                            if (item.accent === AccentValue.High) return `<i>${item.text}</i>`;
                            if (item.accent === AccentValue.Drop) return `<b>${item.text}</b>`;
                            return item.text;
                        })
                        .join('');

                    return `{${word.surface}|${furigana}}`;
                })
                .join('')
                .replace(/<\/b><b>/g, '')
                .replace(/<\/i><i>/g, '');

            navigator.clipboard
                .writeText(content)
                .then(() => showFeedback('HackMD形式でコピーしました！', 'success'))
                .catch(err => {
                    console.error('コピー失敗', err);
                    showFeedback('コピーに失敗しました', 'warning');
                });
        };

        const downloadImage = async (): Promise<void> => {
            if (resultRef.current === null || isEmpty) return;

            const bgColor = isDarkResult ? '#1F2937' : '#FFFFFF';
            const { toPng } = await preloadExportModules();
            toPng(resultRef.current, { backgroundColor: bgColor, pixelRatio: 2 })
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

        const downloadPDF = async (): Promise<void> => {
            if (resultRef.current === null || isEmpty) return;

            const bgColor = isDarkResult ? '#1F2937' : '#FFFFFF';
            const element = resultRef.current;
            const padding = 40;
            const width = element.offsetWidth + padding;
            const height = element.offsetHeight + padding;
            const { toPng, jsPDF } = await preloadExportModules();

            toPng(element, {
                backgroundColor: bgColor,
                pixelRatio: 2,
                width,
                height,
                style: {
                    padding: '20px',
                    boxSizing: 'border-box',
                },
            })
                .then(imgData => {
                    const orientation = width > height ? 'landscape' : 'portrait';
                    const pdf = new jsPDF({
                        orientation,
                        unit: 'px',
                        format: [width, height],
                    });
                    pdf.addImage(imgData, 'PNG', 0, 0, width, height);
                    pdf.save('accented-text.pdf');
                })
                .catch(err => {
                    console.error('PDFの生成に失敗しました', err);
                });
        };

        const updateKana = (wordIndex: number, textIndex: number, newAccent: AccentValueType): void => {
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
                <p className='result-area' ref={resultRef}>
                    {words.map((word, wordIndex) => {
                        const surfaceSegments = getSurfaceSegments(word);
                        const kanaWord = isKana(word.surface);
                        const kanaAccents = Array.isArray(word.accent) ? word.accent : null;

                        return (
                            <ruby key={`${wordIndex}-${word.surface}`}>
                                {surfaceSegments.map((segment, charIndex) => (
                                    <span key={`${wordIndex}-${charIndex}`}>{segment}</span>
                                ))}
                                <rt>
                                    {kanaWord && kanaAccents
                                        ? surfaceSegments.map((_segment, charIndex) => (
                                              <Kana
                                                  key={`${wordIndex}-${charIndex}`}
                                                  text=''
                                                  accent={kanaAccents[charIndex] ?? AccentValue.None}
                                                  onUpdate={(_ignore, newAccent) =>
                                                      updateKana(wordIndex, charIndex, newAccent)
                                                  }
                                              />
                                          ))
                                        : word.furigana.map((char, charIndex) => (
                                              <Kana
                                                  key={`${wordIndex}-${charIndex}`}
                                                  editable
                                                  text={char.text === placeholder ? '' : char.text}
                                                  accent={char.accent}
                                                  onUpdate={(newText, newAccent) =>
                                                      updateFurigana(wordIndex, charIndex, newText, newAccent)
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
                            <button
                                className='action-button'
                                onClick={copyPlainText}
                                title='テキスト形式でコピー'
                            >
                                <Copy size={18} />
                            </button>
                            <button
                                className='action-button'
                                onClick={copyResult}
                                title='HackMD形式でコピー (カスタムレンダリング用)'
                            >
                                <CodeXml size={18} />
                            </button>
                        </div>

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
                                            downloadPDF();
                                            setIsMenuOpen(false);
                                        }}
                                    >
                                        <FileText size={16} />
                                        <span>PDF</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    },
);

Result.displayName = 'Result';

export default Result;
