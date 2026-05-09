import { useEffect, useRef, useState } from 'react';

export default function useThrottle<T>(value: T, delay: number): T {
    const [throttledValue, setThrottledValue] = useState<T>(value);
    const lastExecutedAtRef = useRef(0);
    const trailingTimeoutRef = useRef<number | null>(null);

    useEffect(() => {
        const now = Date.now();
        const elapsed = now - lastExecutedAtRef.current;

        if (lastExecutedAtRef.current === 0 || elapsed >= delay) {
            lastExecutedAtRef.current = now;
            setThrottledValue(value);

            if (trailingTimeoutRef.current !== null) {
                window.clearTimeout(trailingTimeoutRef.current);
                trailingTimeoutRef.current = null;
            }

            return;
        }

        const remainingDelay = delay - elapsed;
        if (trailingTimeoutRef.current !== null) {
            window.clearTimeout(trailingTimeoutRef.current);
        }

        trailingTimeoutRef.current = window.setTimeout(() => {
            lastExecutedAtRef.current = Date.now();
            setThrottledValue(value);
            trailingTimeoutRef.current = null;
        }, remainingDelay);

        return () => {
            if (trailingTimeoutRef.current !== null) {
                window.clearTimeout(trailingTimeoutRef.current);
                trailingTimeoutRef.current = null;
            }
        };
    }, [value, delay]);

    return throttledValue;
}
