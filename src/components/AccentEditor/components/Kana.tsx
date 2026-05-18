import {
    memo,
    useRef,
    type CompositionEvent,
    type FocusEvent,
    type KeyboardEvent,
    type MouseEvent,
} from 'react';

import { useI18n } from '../../../i18n';
import { placeholder } from '../constant/placeholder';

import type { AccentValueType } from '../core/word/accentTypes';

import './Kana.css';

interface KanaProps {
    accentPhaseActive?: boolean;
    accentVisible?: boolean;
    text: string;
    textVisible?: boolean;
    accent: AccentValueType;
    onUpdate?: (text: string, accent: AccentValueType) => void;
    onBackspaceAtStart?: (currentText: string) => boolean;
    onDeleteAtStart?: (currentText: string) => boolean;
    onArrowAtEdge?: (direction: 'previous' | 'next') => boolean;
    editable?: boolean;
    ghost?: boolean;
    onFocusChange?: (isFocused: boolean) => void;
    registerTextRef?: (node: HTMLSpanElement | null) => void;
    textIndex?: number;
    wordIndex?: number;
    interactive?: boolean;
}

const accentName = ['none', 'flat', 'drop'] as const;

function Kana({
    accentPhaseActive = true,
    accentVisible = true,
    text,
    textVisible = true,
    accent,
    onUpdate,
    onBackspaceAtStart,
    onDeleteAtStart,
    onArrowAtEdge,
    editable = false,
    ghost = false,
    onFocusChange,
    registerTextRef,
    textIndex,
    wordIndex,
    interactive = true,
}: KanaProps) {
    const { t } = useI18n();
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

    const setCaretPosition = (element: HTMLSpanElement, placement: 'start' | 'end'): void => {
        const selection = window.getSelection();
        if (!selection) return;

        const range = document.createRange();
        range.selectNodeContents(element);
        range.collapse(placement === 'start');
        selection.removeAllRanges();
        selection.addRange(range);
        element.focus();
    };

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

    const isCaretAtEnd = (element: HTMLSpanElement): boolean => {
        const selection = window.getSelection();
        if (!selection || !selection.isCollapsed || selection.rangeCount === 0) {
            return false;
        }

        const range = selection.getRangeAt(0).cloneRange();
        range.selectNodeContents(element);
        range.setStart(selection.anchorNode!, selection.anchorOffset);
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

    const handleMouseDown = (event: MouseEvent<HTMLSpanElement>): void => {
        if (!editable || event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey) {
            return;
        }

        event.preventDefault();

        const target = event.currentTarget;
        const { left, width } = target.getBoundingClientRect();
        const placement = event.clientX <= left + width / 2 ? 'start' : 'end';
        setCaretPosition(target, placement);
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

        if (event.key === 'Delete') {
            const currentText = getSanitizedText();
            if ((currentText.length === 0 || isCaretAtStart(target)) && onDeleteAtStart?.(currentText)) {
                event.preventDefault();
                return;
            }
        }

        if (event.key === 'Backspace' && target.innerText.length <= 1) {
            target.innerText = placeholder;
        }

        if (event.key === 'ArrowLeft' && isCaretAtStart(target) && onArrowAtEdge?.('previous')) {
            event.preventDefault();
            return;
        }

        if (event.key === 'ArrowRight' && isCaretAtEnd(target) && onArrowAtEdge?.('next')) {
            event.preventDefault();
            return;
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

    const setTextNodeRef = (node: HTMLSpanElement | null): void => {
        textRef.current = node;
        registerTextRef?.(node);
    };

    return (
        <span
            className='kana-shell'
            data-accent={accentName[accent]}
            data-accent-phase-active={accentPhaseActive || undefined}
            data-accent-visible={accentVisible || undefined}
            data-editable={editable || undefined}
            data-empty={text.length === 0 || undefined}
            data-ghost={ghost || undefined}
            data-interactive={interactive || undefined}
        >
            <span className='kana-accent-lane' aria-hidden='true'>
                <span className='kana-accent-line' />
                <span className='kana-accent-drop' />
                <button
                    type='button'
                    className='kana-accent-hitbox'
                    disabled={!interactive || !accentPhaseActive}
                    onClick={changeAccent}
                    onMouseDown={handleAccentMouseDown}
                    aria-label={t.switchAccent}
                    title={t.switchAccent}
                />
            </span>
            <span
                ref={setTextNodeRef}
                className={`kana-text ${editable ? 'furigana' : ''}`}
                contentEditable={editable && interactive ? true : undefined}
                suppressContentEditableWarning
                onBlur={finishEditing}
                onCompositionEnd={handleCompositionEnd}
                onCompositionStart={handleCompositionStart}
                onFocus={handleFocus}
                onKeyDown={handleKeyDown}
                onMouseDown={handleMouseDown}
                role={editable ? 'textbox' : undefined}
                aria-label={editable ? t.editFurigana : undefined}
                aria-multiline={editable || undefined}
                autoCapitalize='off'
                autoCorrect='off'
                inputMode='text'
                spellCheck={false}
                data-text-index={editable ? textIndex : undefined}
                data-word-index={editable ? wordIndex : undefined}
                data-text-visible={textVisible || undefined}
            >
                {text}
            </span>
        </span>
    );
}

function areKanaPropsEqual(previous: KanaProps, next: KanaProps): boolean {
    return (
        previous.accentPhaseActive === next.accentPhaseActive &&
        previous.accent === next.accent &&
        previous.accentVisible === next.accentVisible &&
        previous.editable === next.editable &&
        previous.ghost === next.ghost &&
        previous.interactive === next.interactive &&
        previous.text === next.text &&
        previous.textVisible === next.textVisible &&
        previous.textIndex === next.textIndex &&
        previous.wordIndex === next.wordIndex
    );
}

export default memo(Kana, areKanaPropsEqual);
