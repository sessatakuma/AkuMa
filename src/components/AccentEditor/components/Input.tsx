import { useRef, useState, type Dispatch, type RefObject, type SetStateAction } from 'react';

import { Dices, Clipboard } from 'lucide-react';

import { useAutoResizeTextarea } from '../../../hooks/useAutoResizeTextarea';
import { useInputModality } from '../../../hooks/useInputModality';
import { useI18n } from '../../../i18n';

import './Input.css';

const sampleParagraphs: readonly string[] = [
    '今日は朝から猫がベランダで日向ぼっこしていたので、つい一緒にゴロゴロしてしまった。',
    '近所のパン屋さんで新作のメロンパンを買ったら、予想以上にサクサクで感動した。',
    '図書館で偶然見つけた本が面白すぎて、気づいたら3時間も経っていた。',
    '雨の中を歩いていたら、傘を持っていない猫と目が合って、思わず傘を貸したくなった。',
];

interface InputProps {
    paragraph: string;
    setParagraph: Dispatch<SetStateAction<string>>;
    isLoading: boolean;
    actionsRef?: RefObject<HTMLDivElement | null>;
}

export default function Input({ paragraph, setParagraph, isLoading, actionsRef }: InputProps) {
    const { lang, t } = useI18n();
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const lastSampleIndexRef = useRef<number | null>(null);
    const [isTextareaFocused, setIsTextareaFocused] = useState(false);
    const isKeyboardModality = useInputModality();

    useAutoResizeTextarea(textareaRef, paragraph);

    const generateRandomParagraph = (): void => {
        if (sampleParagraphs.length === 0) return;

        let nextIndex = Math.floor(Math.random() * sampleParagraphs.length);

        if (sampleParagraphs.length > 1) {
            while (nextIndex === lastSampleIndexRef.current) {
                nextIndex = Math.floor(Math.random() * sampleParagraphs.length);
            }
        }

        lastSampleIndexRef.current = nextIndex;
        setParagraph(sampleParagraphs[nextIndex]);
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
            <label id='accent-input-label' className='visually-hidden' htmlFor='accent-input'>
                {t.inputLabel}
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
                placeholder={t.inputPlaceholder}
                aria-labelledby='accent-input-label'
                aria-describedby='input-shortcuts'
                aria-controls='accent-result-output'
                aria-busy={isLoading}
                lang={lang}
                rows={1}
            />
            <p id='input-shortcuts' className='visually-hidden'>
                {t.inputDescription}
            </p>

            <div className='input-actions' aria-label={t.inputTools} ref={actionsRef}>
                {!paragraph && (
                    <button
                        className='paste-button'
                        onClick={handlePaste}
                        title={t.pasteFromClipboard}
                        aria-label={t.pasteFromClipboard}
                        type='button'
                    >
                        <Clipboard size={20} />
                    </button>
                )}

                <button
                    className='generate-button'
                    onClick={generateRandomParagraph}
                    title={t.randomSample}
                    aria-label={t.randomSample}
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
