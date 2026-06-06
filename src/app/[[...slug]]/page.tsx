import App from '../../App';
import {
    DEFAULT_LOCALE,
    localeToLang,
    normalizeLocale,
    translations,
    type Locale,
} from '../../i18nConfig';

import type { Metadata } from 'next';

interface PageProps {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function resolveLocaleFromSearchParams(
    searchParams: Record<string, string | string[] | undefined>,
): Locale {
    const rawLocale = searchParams.lang;
    const localeValue = Array.isArray(rawLocale) ? rawLocale[0] : rawLocale;

    return normalizeLocale(localeValue) ?? DEFAULT_LOCALE;
}

function buildLocaleUrl(locale: Locale) {
    if (locale === DEFAULT_LOCALE) {
        return '/';
    }

    return `/?lang=${locale}`;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
    const locale = resolveLocaleFromSearchParams(await searchParams);
    const translation = translations[locale];

    return {
        title: translation.title,
        description: translation.pageDescription,
        alternates: {
            canonical: buildLocaleUrl(locale),
            languages: {
                en: '/',
                ja: '/?lang=ja',
                'zh-Hant': '/?lang=zh',
            },
        },
        openGraph: {
            description: translation.pageDescription,
            locale: localeToLang[locale] === 'zh-Hant' ? 'zh_Hant' : localeToLang[locale],
            title: translation.title,
        },
        twitter: {
            description: translation.pageDescription,
            title: translation.title,
        },
    };
}

export default async function Page({ searchParams }: PageProps) {
    const initialLocale = resolveLocaleFromSearchParams(await searchParams);

    return <App initialLocale={initialLocale} />;
}
