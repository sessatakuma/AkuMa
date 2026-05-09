import { useEffect, useState } from 'react';

const LOADING_CHARACTER_INTERVAL_MS = 22;

export function useResultReveal({
    isLoading,
    paragraph,
}: {
    isLoading: boolean;
    paragraph: string;
}) {
    const [revealedLoadingCharacters, setRevealedLoadingCharacters] = useState(0);

    useEffect(() => {
        if (paragraph.trim() === '') {
            setRevealedLoadingCharacters(0);
            return;
        }

        if (!isLoading) {
            return;
        }

        const characters = [...paragraph].filter(character => !/\s/.test(character));
        if (characters.length === 0) {
            setRevealedLoadingCharacters(0);
            return;
        }

        setRevealedLoadingCharacters(0);

        const intervalId = window.setInterval(() => {
            setRevealedLoadingCharacters(currentCount => {
                if (currentCount >= characters.length) {
                    window.clearInterval(intervalId);
                    return currentCount;
                }

                return currentCount + 1;
            });
        }, LOADING_CHARACTER_INTERVAL_MS);

        return () => window.clearInterval(intervalId);
    }, [isLoading, paragraph]);

    return {
        revealedLoadingCharacters,
    };
}
