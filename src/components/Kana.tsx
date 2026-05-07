import { useRef, type FocusEvent, type KeyboardEvent, type MouseEvent } from 'react';

import { placeholder } from 'utilities/placeholder';
import type { AccentValueType } from 'utilities/types';

interface KanaProps {
    text: string;
    accent: AccentValueType;
    onUpdate?: (text: string, accent: AccentValueType) => void;
    editable?: boolean;
    onFocusChange?: (isFocused: boolean) => void;
}

const accentName = ['none', 'flat', 'drop'] as const;

export default function Kana({
    text,
    accent,
    onUpdate,
    editable = false,
    onFocusChange,
}: KanaProps) {
    const textRef = useRef<HTMLSpanElement>(null);

    const getCurrentText = (): string => {
        const currentText = textRef.current?.innerText ?? text;
        if (!editable) {
            return currentText;
        }

        return currentText.trim().length === 0 ? placeholder : currentText;
    };

    const changeType = (event: MouseEvent<HTMLSpanElement>): void => {
        const target = event.target as HTMLSpanElement;
        onUpdate?.(target.innerText, ((accent + 1) % 3) as AccentValueType);
    };

    const changeEditableAccent = (event: MouseEvent<HTMLButtonElement>): void => {
        event.preventDefault();
        event.stopPropagation();
        onUpdate?.(getCurrentText(), ((accent + 1) % 3) as AccentValueType);
    };

    const finishEditing = (event: FocusEvent<HTMLSpanElement>): void => {
        if (!editable) return;
        const target = event.target as HTMLSpanElement;
        onUpdate?.(target.innerText, accent);
        onFocusChange?.(false);
    };

    const handleFocus = (_event: FocusEvent<HTMLSpanElement>): void => {
        onFocusChange?.(true);
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLSpanElement>): void => {
        const target = event.target as HTMLSpanElement;
        if ((event.metaKey || event.ctrlKey) && ['z', 'y'].includes(event.key.toLowerCase())) {
            return;
        }

        if (event.key === 'Backspace' && target.innerText.length <= 1) {
            target.innerText = placeholder;
        }

        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            if (target.innerText.length === 0) target.innerText = placeholder;
            target.blur();
        }
    };

    if (editable) {
        return (
            <span className='kana-edit-shell'>
                <button
                    type='button'
                    className='kana-accent-hitbox'
                    onClick={changeEditableAccent}
                    aria-label='アクセントを切り替え'
                    title='アクセントを切り替え'
                />
                <span
                    ref={textRef}
                    className={`kana ${accent ? `accent-${accentName[accent]}` : ''} furigana`}
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={finishEditing}
                    onFocus={handleFocus}
                    onKeyDown={handleKeyDown}
                >
                    {text}
                </span>
            </span>
        );
    }

    return (
        <span
            className={`kana ${accent ? `accent-${accentName[accent]}` : ''}`}
            onClick={changeType}
        >
            {text}
        </span>
    );
}
