(function registerAkumaExtensionAnnotationRenderer(globalScope: typeof globalThis) {
    const runtimeScope = globalScope as unknown as Window;
    runtimeScope.AKUMA_EXTENSION ??= {};
    const namespace = runtimeScope.AKUMA_EXTENSION;

    const kanaPattern = /^[\u3040-\u309f\u30a0-\u30ffー・]+$/u;

    async function annotateText(text: string, options: AkumaAnnotateOptions) {
        const trimmed = text.trim();
        if (trimmed.length === 0) {
            return document.createDocumentFragment();
        }

        const apiResult = await namespace.api?.markAccent(trimmed);
        const words = apiResult && namespace.mapper?.mapApiResultToWords
            ? namespace.mapper.mapApiResultToWords(apiResult)
            : namespace.mapper?.mapFallbackTextToWords(trimmed) ?? [];

        return renderWords(words, options);
    }

    function renderWords(words: AkumaWord[], options: AkumaAnnotateOptions) {
        const fragment = document.createDocumentFragment();

        for (const word of words) {
            fragment.append(renderWord(word, options));
        }

        return fragment;
    }

    function renderWord(word: AkumaWord, options: AkumaAnnotateOptions) {
        const accents = Array.isArray(word.accent) ? word.accent : [];
        if (kanaPattern.test(word.surface) && accents.length > 0) {
            const span = document.createElement('span');
            span.className = 'akuma-crx-word akuma-crx-kana-word';
            splitKanaSyllables(word.surface).forEach((segment, index) => {
                span.append(renderKana(segment, accents[index] ?? 0, options.showAccent));
            });
            return span;
        }

        const readings = word.furigana.map(item => item.text).filter(Boolean);
        if (readings.length === 0) {
            return document.createTextNode(word.surface);
        }

        const span = document.createElement('span');
        span.className = 'akuma-crx-word';
        const surfaceSegments = [...word.surface];
        const accentItems = word.furigana.length > 0 ? word.furigana : [{ accent: 0 as AkumaAccentValue, text: '' }];

        if (surfaceSegments.length === accentItems.length) {
            surfaceSegments.forEach((surface, index) => {
                span.append(renderRuby(surface, accentItems[index]?.text ?? '', accentItems[index]?.accent ?? 0, options));
            });
            return span;
        }

        span.append(renderRuby(word.surface, readings.join(''), accentItems[0]?.accent ?? 0, options));
        return span;
    }

    function renderRuby(surface: string, reading: string, accent: AkumaAccentValue, options: AkumaAnnotateOptions) {
        const ruby = document.createElement('ruby');
        ruby.className = 'akuma-crx-ruby';
        ruby.append(document.createTextNode(surface));

        const rt = document.createElement('rt');
        rt.className = 'akuma-crx-reading';
        if (options.showAccent && reading.length > 0) {
            rt.append(renderKana(reading, accent, true));
        } else {
            rt.textContent = reading;
        }
        ruby.append(rt);

        return ruby;
    }

    function renderKana(text: string, accent: AkumaAccentValue, showAccent: boolean) {
        const shell = document.createElement('span');
        shell.className = 'akuma-crx-kana';
        shell.dataset.accent = getAccentName(accent);
        shell.dataset.accentVisible = showAccent ? 'true' : 'false';

        const lane = document.createElement('span');
        lane.className = 'akuma-crx-accent-lane';
        const label = document.createElement('span');
        label.className = 'akuma-crx-kana-text';
        label.textContent = text;

        shell.append(lane, label);
        return shell;
    }

    function splitKanaSyllables(text: string) {
        const syllables: string[] = [];
        for (const char of [...text]) {
            if (/^[ゃゅょャュョぁぃぅぇぉァィゥェォっッ]$/u.test(char) && syllables.length > 0) {
                syllables[syllables.length - 1] += char;
                continue;
            }
            syllables.push(char);
        }
        return syllables;
    }

    function getAccentName(accent: AkumaAccentValue) {
        if (accent === 1) {
            return 'high';
        }
        if (accent === 2) {
            return 'drop';
        }
        return 'none';
    }

    namespace.annotate = {
        annotateText,
    };
})(globalThis);
