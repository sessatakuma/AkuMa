'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import {
    DEFAULT_LOCALE,
    localeToLang,
    normalizeLocale,
    translations,
    type Locale,
    type TranslationSet,
} from './i18nConfig';

interface I18nContextValue {
    locale: Locale;
    lang: string;
    t: TranslationSet;
}

const STORAGE_KEY = 'accent-marker-locale';

const I18nContext = createContext<I18nContextValue | null>(null);

function resolveBrowserLocale(initialLocale: Locale): Locale {
    if (typeof window === 'undefined') {
        return initialLocale;
    }

    const searchLocale = normalizeLocale(new URLSearchParams(window.location.search).get('lang'));
    if (searchLocale) {
        window.localStorage.setItem(STORAGE_KEY, searchLocale);
        return searchLocale;
    }

    const storedLocale = normalizeLocale(window.localStorage.getItem(STORAGE_KEY));
    if (storedLocale) {
        return storedLocale;
    }

    return normalizeLocale(window.navigator.language) ?? DEFAULT_LOCALE;
}

function updateMetadata(locale: Locale, translation: TranslationSet): void {
    document.documentElement.lang = localeToLang[locale];
    document.title = translation.title;

    const description = document.querySelector('meta[name="description"]');
    description?.setAttribute('content', translation.pageDescription);

    const ogTitle = document.querySelector('meta[property="og:title"]');
    ogTitle?.setAttribute('content', translation.title);

    const ogDescription = document.querySelector('meta[property="og:description"]');
    ogDescription?.setAttribute('content', translation.pageDescription);

    const twitterTitle = document.querySelector('meta[name="twitter:title"]');
    twitterTitle?.setAttribute('content', translation.title);

    const twitterDescription = document.querySelector('meta[name="twitter:description"]');
    twitterDescription?.setAttribute('content', translation.pageDescription);
}

export function I18nProvider({
    children,
    initialLocale = DEFAULT_LOCALE,
}: {
    children: ReactNode;
    initialLocale?: Locale;
}) {
    const [locale, setLocale] = useState<Locale>(initialLocale);
    const value = useMemo<I18nContextValue>(
        () => ({
            locale,
            lang: localeToLang[locale],
            t: translations[locale],
        }),
        [locale],
    );

    useEffect(() => {
        const browserLocale = resolveBrowserLocale(initialLocale);

        if (browserLocale !== locale) {
            setLocale(browserLocale);
        }
    }, [initialLocale, locale]);

    useEffect(() => {
        updateMetadata(locale, translations[locale]);
    }, [locale]);

    return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
    const context = useContext(I18nContext);

    if (!context) {
        throw new Error('useI18n must be used within an I18nProvider');
    }

    return context;
}
