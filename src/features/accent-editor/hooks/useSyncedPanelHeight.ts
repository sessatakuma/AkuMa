import { useEffect, useRef, useState } from 'react';

const MIN_PANEL_HEIGHT = 500;

export function useSyncedPanelHeight<T extends HTMLElement>() {
    const panelRef = useRef<T>(null);
    const [minHeight, setMinHeight] = useState(MIN_PANEL_HEIGHT);

    useEffect(() => {
        const panel = panelRef.current;
        if (!panel) return;

        const syncHeight = (): void => {
            setMinHeight(Math.max(MIN_PANEL_HEIGHT, Math.ceil(panel.getBoundingClientRect().height)));
        };

        syncHeight();

        const observer = new ResizeObserver(() => {
            syncHeight();
        });

        observer.observe(panel);
        return () => observer.disconnect();
    }, []);

    return {
        minHeight,
        panelRef,
    };
}
