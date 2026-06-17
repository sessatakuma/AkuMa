import './SkeletonLoader.css';

interface SkeletonLoaderProps {
    className?: string;
    paragraph: string;
    revealedCharacterCount: number;
}

function renderLine(line: string, startIndex: number) {
    let characterIndex = startIndex;

    return [...line].map((character, index) => {
        const isSpace = /\s/.test(character);
        const currentIndex = characterIndex;

        if (!isSpace) {
            characterIndex += 1;
        }

        return {
            character,
            currentIndex,
            isSpace,
            key: `${startIndex}-${index}-${character}`,
        };
    });
}

export default function SkeletonLoader({
    className = '',
    paragraph,
    revealedCharacterCount,
}: SkeletonLoaderProps) {
    const sourceLines = paragraph.split('\n');
    let characterOffset = 0;

    return (
        <div className={`skeleton-container ${className}`.trim()} aria-hidden='true'>
            <div className='skeleton-script' role='presentation'>
                {sourceLines.map((line, lineIndex) => {
                    const tokens = renderLine(line || '　', characterOffset);
                    characterOffset += [...line].filter(character => !/\s/.test(character)).length;

                    return (
                        <p key={`${lineIndex}-${line}`} className='skeleton-line'>
                            {tokens.map(token => {
                                const isVisible =
                                    !token.isSpace && token.currentIndex < revealedCharacterCount;

                                return (
                                    <span
                                        key={token.key}
                                        className={`skeleton-glyph ${token.isSpace ? 'skeleton-glyph-space' : ''} ${
                                            isVisible
                                                ? 'skeleton-glyph-visible'
                                                : 'skeleton-glyph-pending'
                                        }`.trim()}
                                    >
                                        {token.character}
                                    </span>
                                );
                            })}
                        </p>
                    );
                })}
            </div>
        </div>
    );
}
