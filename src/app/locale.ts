import {
    DEFAULT_LOCALE,
    localeToLang,
    normalizeLocale,
    translations,
    type Locale,
} from '../i18nConfig';

export const SITE_URL = 'https://accent-marker.sessatakuma.dev/';
export const LOCALE_HEADER = 'x-accent-marker-locale';

export function resolveLocaleFromSearchParams(
    searchParams: Record<string, string | string[] | undefined>,
): Locale {
    const rawLocale = searchParams.lang;
    const localeValue = Array.isArray(rawLocale) ? rawLocale[0] : rawLocale;

    return normalizeLocale(localeValue) ?? DEFAULT_LOCALE;
}

export function resolveLocaleFromHeader(value: string | null): Locale {
    return normalizeLocale(value) ?? DEFAULT_LOCALE;
}

export function buildLocaleUrl(locale: Locale) {
    if (locale === DEFAULT_LOCALE) {
        return '/';
    }

    return `/?lang=${locale}`;
}

export function buildLocaleMetadata(locale: Locale) {
    const translation = translations[locale];

    return {
        locale,
        localeCode: localeToLang[locale],
        title: translation.title,
        description: translation.pageDescription,
        canonical: buildLocaleUrl(locale),
        languages: {
            en: '/',
            ja: '/?lang=ja',
            'zh-Hant': '/?lang=zh',
        },
    };
}

export function buildStructuredData(locale: Locale) {
    const metadata = buildLocaleMetadata(locale);

    return {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: 'Accent Marker',
        url: new URL(metadata.canonical, SITE_URL).toString(),
        applicationCategory: 'EducationalApplication',
        operatingSystem: 'Any',
        description: metadata.description,
        image: new URL('/images/logo.png', SITE_URL).toString(),
        inLanguage: [metadata.localeCode],
        offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'USD',
        },
    };
}
