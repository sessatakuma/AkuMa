(function registerAkumaExtensionAccentMappers(globalScope: typeof globalThis) {
    const runtimeScope = globalScope as unknown as Window;
    runtimeScope.AKUMA_EXTENSION ??= {};
    const namespace = runtimeScope.AKUMA_EXTENSION;

    const AccentValue = {
        Drop: 2,
        High: 1,
        None: 0,
    } as const;

    const kanaPattern = /^[\u3040-\u309f\u30a0-\u30ffー・\s]+$/u;

    function isKana(text: string) {
        return text.length > 0 && kanaPattern.test(text);
    }

    function splitKanaSyllables(text: string) {
        const syllables: string[] = [];
        const chars = [...text];

        for (const char of chars) {
            if (/^[ゃゅょャュョぁぃぅぇぉァィゥェォっッ]$/u.test(char) && syllables.length > 0) {
                syllables[syllables.length - 1] += char;
                continue;
            }
            syllables.push(char);
        }

        return syllables;
    }

    function mapApiResultToWords(result: AkumaMarkAccentEntry[]): AkumaWord[] {
        return result.map(word => {
            const kanaWord = isKana(word.surface);
            const accent = word.accent.map(item => normalizeAccent(item.accent_marking_type));

            return {
                accent,
                furigana: kanaWord
                    ? []
                    : word.accent.length > 0
                      ? word.accent.map(item => ({
                            accent: normalizeAccent(item.accent_marking_type),
                            text: item.furigana,
                        }))
                      : [{ accent: AccentValue.None, text: '' }],
                surface: word.surface,
            };
        });
    }

    function mapFallbackTextToWords(text: string): AkumaWord[] {
        const segmenter = new Intl.Segmenter('ja', { granularity: 'word' });

        return [...segmenter.segment(text)].map(segment => {
            const surface = segment.segment;
            return {
                accent: isKana(surface) ? splitKanaSyllables(surface).map(() => AccentValue.None) : AccentValue.None,
                furigana: isKana(surface) ? [] : [{ accent: AccentValue.None, text: '' }],
                surface,
            };
        });
    }

    function normalizeAccent(value: number): AkumaAccentValue {
        return value === AccentValue.High || value === AccentValue.Drop ? value : AccentValue.None;
    }

    namespace.mapper = {
        mapApiResultToWords,
        mapFallbackTextToWords,
    };
})(globalThis);
