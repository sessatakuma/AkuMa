import App from '../../App';
import {
    buildLocaleMetadata,
    resolveLocaleFromSearchParams,
} from '../locale';

import type { Metadata } from 'next';

interface PageProps {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
    const locale = resolveLocaleFromSearchParams(await searchParams);
    const localeMetadata = buildLocaleMetadata(locale);

    return {
        title: localeMetadata.title,
        description: localeMetadata.description,
        alternates: {
            canonical: localeMetadata.canonical,
            languages: localeMetadata.languages,
        },
        openGraph: {
            description: localeMetadata.description,
            locale:
                localeMetadata.localeCode === 'zh-Hant' ? 'zh_Hant' : localeMetadata.localeCode,
            title: localeMetadata.title,
            url: localeMetadata.absoluteUrl,
        },
        twitter: {
            description: localeMetadata.description,
            title: localeMetadata.title,
        },
    };
}

export default async function Page({ searchParams }: PageProps) {
    const initialLocale = resolveLocaleFromSearchParams(await searchParams);

    return <App initialLocale={initialLocale} />;
}
