import { useRef, type FocusEvent, type KeyboardEvent, type MouseEvent } from 'react';

import { placeholder } from 'utilities/placeholder';

import type { AccentValueType } from 'utilities/types';

interface KanaProps {
    text: string;
    accent: AccentValueType;
    onUpdate?: (text: string, accent: AccentValueType) => void;
    editable?: boolean;
    ghost?: boolean;
    onFocusChange?: (isFocused: boolean) => void;
}

const accentName = ['none', 'flat', 'drop'] as const;

export default function Kana({
    text,
    accent,
    onUpdate,
    editable = false,
    ghost = false,
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

    const changeAccent = (event: MouseEvent<HTMLButtonElement>): void => {
        event.preventDefault();
        event.stopPropagation();
        textRef.current?.blur();
        onUpdate?.(getCurrentText(), ((accent + 1) % 3) as AccentValueType);
    };

    const handleAccentMouseDown = (event: MouseEvent<HTMLButtonElement>): void => {
        event.preventDefault();
        event.stopPropagation();
    };

    const finishEditing = (event: FocusEvent<HTMLSpanElement>): void => {
        if (!editable) return;
        const target = event.target as HTMLSpanElement;
        onUpdate?.(target.innerText, accent);
        onFocusChange?.(false);
    };

    const handleFocus = (): void => {
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

    return (
        <span
            className='kana-shell'
            data-accent={accentName[accent]}
            data-editable={editable || undefined}
            data-empty={text.length === 0 || undefined}
            data-ghost={ghost || undefined}
        >
            <span className='kana-accent-lane' aria-hidden='true'>
                <button
                    type='button'
                    className='kana-accent-hitbox'
                    onClick={changeAccent}
                    onMouseDown={handleAccentMouseDown}
                    aria-label='アクセントを切り替え'
                    title='アクセントを切り替え'
                />
            </span>
            <span
                ref={textRef}
                className={`kana-text ${editable ? 'furigana' : ''}`}
                contentEditable={editable || undefined}
                suppressContentEditableWarning
                onBlur={finishEditing}
                onFocus={handleFocus}
                onKeyDown={handleKeyDown}
                role={editable ? 'textbox' : undefined}
                aria-label={editable ? 'ふりがなを編集' : undefined}
                aria-multiline={editable || undefined}
            >
                {text}
            </span>
        </span>
    );
}
