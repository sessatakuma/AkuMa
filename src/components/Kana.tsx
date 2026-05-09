import {
    useRef,
    type CompositionEvent,
    type FocusEvent,
    type KeyboardEvent,
    type MouseEvent,
} from 'react';

import { placeholder } from './placeholder';

import type { AccentValueType } from './accentTypes';

interface KanaProps {
    text: string;
    accent: AccentValueType;
    onUpdate?: (text: string, accent: AccentValueType) => void;
    onBackspaceAtStart?: (currentText: string) => boolean;
    editable?: boolean;
    ghost?: boolean;
    onFocusChange?: (isFocused: boolean) => void;
    textIndex?: number;
    wordIndex?: number;
}

const accentName = ['none', 'flat', 'drop'] as const;

export default function Kana({
    text,
    accent,
    onUpdate,
    onBackspaceAtStart,
    editable = false,
    ghost = false,
    onFocusChange,
    textIndex,
    wordIndex,
}: KanaProps) {
    const textRef = useRef<HTMLSpanElement>(null);
    const isComposingRef = useRef(false);
    const shouldCommitAfterCompositionRef = useRef(false);

    const getCurrentText = (): string => {
        const currentText = textRef.current?.innerText ?? text;
        if (!editable) {
            return currentText;
        }

        return currentText.trim().length === 0 ? placeholder : currentText;
    };

    const commitText = (nextText: string): void => {
        onUpdate?.(nextText, accent);
        onFocusChange?.(false);
    };

    const getSanitizedText = (): string =>
        (textRef.current?.innerText ?? text).replaceAll(placeholder, '').trim();

    const isCaretAtStart = (element: HTMLSpanElement): boolean => {
        const selection = window.getSelection();
        if (!selection || !selection.isCollapsed || selection.rangeCount === 0) {
            return false;
        }

        const range = selection.getRangeAt(0).cloneRange();
        range.selectNodeContents(element);
        range.setEnd(selection.anchorNode!, selection.anchorOffset);
        return range.toString().length === 0;
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
        if (isComposingRef.current) {
            shouldCommitAfterCompositionRef.current = true;
            return;
        }

        commitText((event.target as HTMLSpanElement).innerText);
    };

    const handleFocus = (): void => {
        onFocusChange?.(true);
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLSpanElement>): void => {
        const target = event.target as HTMLSpanElement;
        if (event.nativeEvent.isComposing || isComposingRef.current || event.key === 'Process') {
            return;
        }

        if ((event.metaKey || event.ctrlKey) && ['z', 'y'].includes(event.key.toLowerCase())) {
            return;
        }

        if (event.key === 'Backspace') {
            const currentText = getSanitizedText();
            if ((currentText.length === 0 || isCaretAtStart(target)) && onBackspaceAtStart?.(currentText)) {
                event.preventDefault();
                return;
            }
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

    const handleCompositionStart = (): void => {
        isComposingRef.current = true;
        shouldCommitAfterCompositionRef.current = false;
    };

    const handleCompositionEnd = (event: CompositionEvent<HTMLSpanElement>): void => {
        isComposingRef.current = false;

        if (shouldCommitAfterCompositionRef.current) {
            shouldCommitAfterCompositionRef.current = false;
            commitText(event.currentTarget.innerText);
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
                onCompositionEnd={handleCompositionEnd}
                onCompositionStart={handleCompositionStart}
                onFocus={handleFocus}
                onKeyDown={handleKeyDown}
                role={editable ? 'textbox' : undefined}
                aria-label={editable ? 'ふりがなを編集' : undefined}
                aria-multiline={editable || undefined}
                autoCapitalize='off'
                autoCorrect='off'
                inputMode='text'
                spellCheck={false}
                data-text-index={editable ? textIndex : undefined}
                data-word-index={editable ? wordIndex : undefined}
            >
                {text}
            </span>
        </span>
    );
}
