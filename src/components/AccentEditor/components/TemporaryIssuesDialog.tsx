import { useEffect } from 'react';

import { useI18n } from '../../../i18n';

interface TemporaryIssuesDialogProps {
    body?: string;
    cancelLabel?: string;
    confirmLabel?: string;
    icon?: React.ReactNode;
    isOpen: boolean;
    onClose: () => void;
    onConfirm?: () => void;
    title?: string;
}

export default function TemporaryIssuesDialog({
    body,
    cancelLabel,
    confirmLabel,
    icon,
    isOpen,
    onClose,
    onConfirm,
    title,
}: TemporaryIssuesDialogProps) {
    const { t } = useI18n();

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const handleKeyDown = (event: KeyboardEvent): void => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) {
        return null;
    }

    return (
        <div className='temporary-issues-dialog-backdrop' role='presentation' onClick={onClose}>
            <div
                className='temporary-issues-dialog'
                role='dialog'
                aria-modal='true'
                aria-labelledby='temporary-issues-dialog-title'
                aria-describedby='temporary-issues-dialog-body'
                onClick={event => event.stopPropagation()}
            >
                {icon && (
                    <div className='temporary-issues-dialog-icon' aria-hidden='true'>
                        {icon}
                    </div>
                )}
                <div className='temporary-issues-dialog-copy'>
                    <h2 id='temporary-issues-dialog-title'>{title ?? t.temporaryIssuesTitle}</h2>
                    <p id='temporary-issues-dialog-body'>{body ?? t.temporaryIssuesBody}</p>
                </div>
                <div className='temporary-issues-dialog-actions'>
                    {cancelLabel && (
                        <button
                            type='button'
                            className='temporary-issues-dialog-button'
                            onClick={onClose}
                        >
                            {cancelLabel}
                        </button>
                    )}
                    <button
                        type='button'
                        className={`temporary-issues-dialog-button${
                            onConfirm ? ' temporary-issues-dialog-button-primary' : ''
                        }`}
                        onClick={onConfirm ?? onClose}
                    >
                        {confirmLabel ?? t.temporaryIssuesClose}
                    </button>
                </div>
            </div>
        </div>
    );
}
