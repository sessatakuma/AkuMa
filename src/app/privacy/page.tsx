import { translations } from '../../i18nConfig';
import { resolveLocaleFromSearchParams } from '../locale';

import PrivacyContent from './PrivacyContent';

import type { Metadata } from 'next';

import './privacy.css';

interface PageProps {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
    const locale = resolveLocaleFromSearchParams(await searchParams);
    const t = translations[locale];

    return {
        title: `${t.privacyTitle} | AkuMa`,
        description: t.privacyDescription,
    };
}

export default async function PrivacyPage({ searchParams }: PageProps) {
    const initialLocale = resolveLocaleFromSearchParams(await searchParams);

    return <PrivacyContent initialLocale={initialLocale} />;
}
