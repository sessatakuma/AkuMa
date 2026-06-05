import { useEffect, useState } from 'react';

import { useI18n } from '../../../i18n';
import { useAccentAnalysis } from '../hooks/useAccentAnalysis';
import { useHistoryKeyboardShortcuts } from '../hooks/useHistoryKeyboardShortcuts';
import { useResultReveal } from '../hooks/useResultReveal';
import { useSyncedPanelHeight } from '../hooks/useSyncedPanelHeight';
import { useWordHistory } from '../hooks/useWordHistory';

import Input from './Input';
import Result from './Result';
import TemporaryIssuesDialog from './TemporaryIssuesDialog';

import './AccentEditor.css';

export default function AccentEditor() {
    const { t } = useI18n();
    const [paragraph, setParagraph] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [isResultExpanded, setIsResultExpanded] = useState(false);
    const [isTemporaryIssuesDialogOpen, setIsTemporaryIssuesDialogOpen] = useState(false);
    const { footerRef, minHeight, panelRef } = useSyncedPanelHeight<HTMLElement>();
    const {
        redoWords,
        replaceVersion,
        replaceWords,
        streamReplaceWords,
        undoWords,
        updateWords,
        words,
    } = useWordHistory();
    const { isLoading, isStreaming, statusMessage } = useAccentAnalysis({
        isEditing,
        onTemporaryIssue: () => setIsTemporaryIssuesDialogOpen(true),
        paragraph,
        replaceWords,
        streamReplaceWords,
    });
    const {
        accentPhaseActive,
        isPresenting,
        revealedAccentUnits,
        revealedFuriganaUnits,
        revealedLoadingCharacters,
    } = useResultReveal({
        analysisVersion: replaceVersion,
        isLoading,
        isStreaming,
        paragraph,
        words,
    });
    const isBusy = isLoading || isPresenting || isStreaming;

    useEffect(() => {
        if (!isResultExpanded) {
            return;
        }

        const handleKeyDown = (event: KeyboardEvent): void => {
            if (event.key === 'Escape') {
                setIsResultExpanded(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isResultExpanded]);

    useEffect(() => {
        const { body } = document;
        const previousOverflow = body.style.overflow;

        if (isResultExpanded) {
            body.style.overflow = 'hidden';
        }

        return () => {
            body.style.overflow = previousOverflow;
        };
    }, [isResultExpanded]);

    useHistoryKeyboardShortcuts({
        onRedo: redoWords,
        onUndo: undoWords,
    });

    return (
        <main id='main-content' className='main-content'>
            <h1 className='visually-hidden'>{t.heading}</h1>
            <p className='visually-hidden' aria-live='polite'>
                {statusMessage}
            </p>
            <div
                className={`two-col-layout ${isResultExpanded ? 'two-col-layout-expanded' : ''}`}
                aria-label={t.resultsAndInput}
            >
                <div className='input-panel-stack'>
                    <section className='input-panel' aria-label={t.inputPanelLabel} ref={panelRef}>
                        <Input
                            paragraph={paragraph}
                            setParagraph={setParagraph}
                            isLoading={isLoading}
                            actionsRef={footerRef}
                        />
                    </section>
                </div>

                <div
                    className={`result-panel-stack ${isResultExpanded ? 'result-panel-stack-expanded' : ''}`}
                >
                    {isBusy && !isResultExpanded && (
                        <p className='result-panel-status' aria-hidden='true'>
                            <span className='result-panel-status-label'>{t.statusAnalyzing}</span>
                            <span className='result-panel-status-dots'>
                                <span className='result-panel-status-dot'>.</span>
                                <span className='result-panel-status-dot'>.</span>
                                <span className='result-panel-status-dot'>.</span>
                            </span>
                        </p>
                    )}
                    <section
                        className={`result-panel ${isResultExpanded ? 'result-panel-expanded' : ''}`}
                        aria-label={t.resultPanelLabel}
                        aria-busy={isBusy}
                        style={{ minHeight: `${minHeight}px` }}
                    >
                        <Result
                            accentPhaseActive={accentPhaseActive}
                            isPresenting={isPresenting}
                            isExpanded={isResultExpanded}
                            paragraph={paragraph}
                            revealedAccentUnits={revealedAccentUnits}
                            revealedFuriganaUnits={revealedFuriganaUnits}
                            revealedLoadingCharacters={revealedLoadingCharacters}
                            words={words}
                            updateWords={updateWords}
                            isLoading={isLoading}
                            onEditingChange={setIsEditing}
                            onToggleExpanded={() => setIsResultExpanded(prev => !prev)}
                            statusMessage={statusMessage}
                        />
                    </section>
                    {words.length > 0 && !isResultExpanded && (
                        <p className='result-panel-hint' aria-hidden='true'>
                            {t.resultHint}
                        </p>
                    )}
                </div>
            </div>
            <TemporaryIssuesDialog
                isOpen={isTemporaryIssuesDialogOpen}
                onClose={() => setIsTemporaryIssuesDialogOpen(false)}
            />
        </main>
    );
}
