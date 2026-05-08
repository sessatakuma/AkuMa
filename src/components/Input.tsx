import { useRef, useEffect, Dispatch, SetStateAction } from 'react';

import { Dices, Clipboard } from 'lucide-react';

import 'components/Input.css';

interface InputProps {
    paragraph: string;
    setParagraph: Dispatch<SetStateAction<string>>;
    isLoading: boolean;
}

export default function Input({ paragraph, setParagraph, isLoading }: InputProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (textareaRef.current) {
            // Reset height to auto to correctly calculate scrollHeight for shrinking
            textareaRef.current.style.height = 'auto';
            // Set new height based on scroll height, but keep it at least 100% of parent if needed (handled by minHeight in style prop)
            const scrollHeight = textareaRef.current.scrollHeight;
            textareaRef.current.style.height = `${scrollHeight}px`;
        }
    }, [paragraph]);

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
            <div className='input-header'>
                <h2 id='input-panel-title' className='panel-title'>
                    入力
                </h2>
                <p id='input-panel-description' className='input-description'>
                    日本語の文章を入力すると、ふりがなとアクセント候補を下に反映します。
                </p>
            </div>

            <label className='visually-hidden' htmlFor='accent-input'>
                解析する日本語テキスト
            </label>
            <textarea
                id='accent-input'
                ref={textareaRef}
                className='input-area'
                value={paragraph}
                onChange={e => setParagraph(e.target.value)}
                placeholder='文章を入力...'
                aria-describedby='input-panel-description input-shortcuts'
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
                    <Dices size={20} />
                </button>
            </div>
        </div>
    );
}
