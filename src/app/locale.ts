import {
    DEFAULT_LOCALE,
    localeToLang,
    normalizeLocale,
    translations,
    type Locale,
} from '../i18nConfig';

export const SITE_URL = 'https://akuma.sessatakuma.dev/';
export const LOCALE_HEADER = 'x-akuma-locale';

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
    const canonical = buildLocaleUrl(locale);

    return {
        locale,
        localeCode: localeToLang[locale],
        title: translation.title,
        description: translation.pageDescription,
        canonical,
        absoluteUrl: new URL(canonical, SITE_URL).toString(),
        languages: {
            en: '/',
            ja: '/?lang=ja',
            'zh-Hant': '/?lang=zh',
            'x-default': '/',
        },
    };
}

export function buildStructuredData(locale: Locale) {
    const metadata = buildLocaleMetadata(locale);

    return {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: 'AkuMa',
        url: metadata.absoluteUrl,
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
