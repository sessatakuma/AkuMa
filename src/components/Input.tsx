import { useRef, useEffect, useState, Dispatch, SetStateAction } from 'react';

import { Dices, Clipboard } from 'lucide-react';

import './Input.css';

interface InputProps {
    paragraph: string;
    setParagraph: Dispatch<SetStateAction<string>>;
    isLoading: boolean;
}

export default function Input({ paragraph, setParagraph, isLoading }: InputProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [isKeyboardModality, setIsKeyboardModality] = useState(false);
    const [isTextareaFocused, setIsTextareaFocused] = useState(false);

    useEffect(() => {
        if (textareaRef.current) {
            // Reset height to auto to correctly calculate scrollHeight for shrinking
            textareaRef.current.style.height = 'auto';
            // Set new height based on scroll height, but keep it at least 100% of parent if needed (handled by minHeight in style prop)
            const scrollHeight = textareaRef.current.scrollHeight;
            textareaRef.current.style.height = `${scrollHeight}px`;
        }
    }, [paragraph]);

    useEffect(() => {
        const handleKeyDown = (): void => {
            setIsKeyboardModality(true);
        };

        const handlePointerDown = (): void => {
            setIsKeyboardModality(false);
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('pointerdown', handlePointerDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('pointerdown', handlePointerDown);
        };
    }, []);

    const generateRandomParagraph = (): void => {
        const examples = [
            '今日は朝から猫がベランダで日向ぼっこしていたので、つい一緒にゴロゴロしてしまった。',
            '近所のパン屋さんで新作のメロンパンを買ったら、予想以上にサクサクで感動した。',
            '図書館で偶然見つけた本が面白すぎて、気づいたら3時間も経っていた。',
            '雨の中を歩いていたら、傘を持っていない猫と目が合って、思わず傘を貸したくなった。',
        ];
        const newText = examples[Math.floor(Math.random() * examples.length)];
        setParagraph(newText);
    };

    const handlePaste = async (): Promise<void> => {
        try {
            const text = await navigator.clipboard.readText();
            if (text) {
                setParagraph(text);
            }
        } catch (err) {
            console.error('Failed to read clipboard contents: ', err);
        }
    };

    return (
        <div className='input-section'>
            <label className='visually-hidden' htmlFor='accent-input'>
                解析する日本語テキスト
            </label>
            <textarea
                id='accent-input'
                ref={textareaRef}
                className={`input-area${isTextareaFocused && isKeyboardModality ? ' input-area-keyboard-focus' : ''}`}
                autoFocus
                value={paragraph}
                onChange={e => setParagraph(e.target.value)}
                onFocus={() => setIsTextareaFocused(true)}
                onBlur={() => setIsTextareaFocused(false)}
                placeholder='文章を入力...'
                aria-describedby='input-shortcuts'
                aria-controls='accent-result-output'
                aria-busy={isLoading}
                lang='ja'
            />
            <p id='input-shortcuts' className='visually-hidden'>
                解析結果は右側の結果領域に表示されます。編集中はアクセントを切り替えたり、ふりがなを直接修正できます。
            </p>

            <div className='input-actions' aria-label='入力補助'>
                {!paragraph && (
                    <button
                        className='paste-button'
                        onClick={handlePaste}
                        title='クリップボードから貼り付け'
                        aria-label='クリップボードから貼り付け'
                        type='button'
                    >
                        <Clipboard size={20} />
                    </button>
                )}

                <button
                    className='generate-button'
                    onClick={generateRandomParagraph}
                    title='ランダムな文章を生成'
                    aria-label='サンプル文を生成'
                    type='button'
                >
                    <span className='generate-button-icon' aria-hidden='true'>
                        <Dices size={20} />
                    </span>
                </button>
            </div>
        </div>
    );
}
