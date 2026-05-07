import { useState, type FocusEvent, type KeyboardEvent, type MouseEvent } from 'react';

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
    const [firstClick, setFirstClick] = useState(editable);

    const changeType = (event: MouseEvent<HTMLSpanElement>): void => {
        const target = event.target as HTMLSpanElement;
        onUpdate?.(target.innerText, ((accent + 1 - (firstClick ? 1 : 0)) % 3) as AccentValueType);
        setFirstClick(false);
    };

    const finishEditing = (event: FocusEvent<HTMLSpanElement>): void => {
        if (!editable) return;
        const target = event.target as HTMLSpanElement;
        onUpdate?.(target.innerText, accent);
        setFirstClick(true);
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

    return (
        <span
            className={`kana ${accent ? `accent-${accentName[accent]}` : ''} ${
                editable ? 'furigana' : ''
            }`}
            onClick={changeType}
            contentEditable={editable}
            suppressContentEditableWarning
            onBlur={finishEditing}
            onFocus={handleFocus}
            onKeyDown={handleKeyDown}
        >
            {text}
        </span>
    );
}
