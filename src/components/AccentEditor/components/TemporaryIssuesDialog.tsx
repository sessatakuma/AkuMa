import { useEffect } from 'react';

import { AlertTriangle } from 'lucide-react';

import { useI18n } from '../../../i18n';

interface TemporaryIssuesDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function TemporaryIssuesDialog({ isOpen, onClose }: TemporaryIssuesDialogProps) {
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
                <div className='temporary-issues-dialog-icon' aria-hidden='true'>
                    <AlertTriangle size={20} />
                </div>
                <div className='temporary-issues-dialog-copy'>
                    <h2 id='temporary-issues-dialog-title'>{t.temporaryIssuesTitle}</h2>
                    <p id='temporary-issues-dialog-body'>{t.temporaryIssuesBody}</p>
                </div>
                <button type='button' className='temporary-issues-dialog-button' onClick={onClose}>
                    {t.temporaryIssuesClose}
                </button>
            </div>
        </div>
    );
}
