import { useEffect, useRef, useState } from 'react';

import { useAccentAnalysis } from 'hooks/useAccentAnalysis';
import { useSyncedPanelHeight } from 'hooks/useSyncedPanelHeight';
import { useWordHistory } from 'hooks/useWordHistory';

import Input from './Input';
import Result from './Result';

import './Main.css';
import './accentMarker.css';

export default function AccentEditor() {
    const [paragraph, setParagraph] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const resultRef = useRef<HTMLDivElement>(null);
    const { minHeight, panelRef } = useSyncedPanelHeight<HTMLElement>();
    const {
        canRedo,
        canUndo,
        redoWords,
        replaceWords,
        undoWords,
        updateWords,
        words,
    } = useWordHistory();
    const { isLoading, statusMessage } = useAccentAnalysis({
        isEditing,
        paragraph,
        replaceWords,
    });

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent): void => {
            const modifier = event.metaKey || event.ctrlKey;
            if (!modifier) return;

            const key = event.key.toLowerCase();
            if (key === 'z' && !event.shiftKey) {
                event.preventDefault();
                undoWords();
            }

            if (key === 'y' || (key === 'z' && event.shiftKey)) {
                event.preventDefault();
                redoWords();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [redoWords, undoWords]);

    return (
        <main id='main-content' className='main-content'>
            <h1 className='visually-hidden'>日本語アクセントマーカー</h1>
            <p className='visually-hidden' aria-live='polite'>
                {statusMessage}
            </p>
            <div className='two-col-layout' aria-label='入力と解析結果'>
                <section className='input-panel' aria-label='入力' ref={panelRef}>
                    <Input paragraph={paragraph} setParagraph={setParagraph} isLoading={isLoading} />
                </section>

                <div className='result-panel-stack' style={{ minHeight: `${minHeight}px` }}>
                    <section className='result-panel' aria-label='結果' aria-busy={isLoading}>
                        <Result
                            words={words}
                            updateWords={updateWords}
                            ref={resultRef}
                            isLoading={isLoading}
                            canUndo={canUndo}
                            canRedo={canRedo}
                            onUndo={undoWords}
                            onRedo={redoWords}
                            onEditingChange={setIsEditing}
                            statusMessage={statusMessage}
                        />
                    </section>
                    {!isLoading && words.length > 0 && (
                        <p className='result-panel-hint' aria-hidden='true'>
                            ふりがな・アクセントをクリックして編集
                        </p>
                    )}
                </div>
            </div>
        </main>
    );
}
