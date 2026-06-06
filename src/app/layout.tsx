import type { ReactNode } from 'react';

import { Noto_Sans_JP } from 'next/font/google';
import { headers } from 'next/headers';

import {
    buildStructuredData,
    LOCALE_HEADER,
    resolveLocaleFromHeader,
    SITE_URL,
} from './locale';

import type { Metadata, Viewport } from 'next';

import '../index.css';

const description =
    'Paste Japanese text to add furigana and pitch-accent markings automatically, then edit and export the result.';
const title = 'Accent Marker | Japanese Pitch Accent & Furigana Tool';

const notoSansJp = Noto_Sans_JP({
    display: 'swap',
    subsets: ['latin'],
    variable: '--font-noto-sans-jp',
});

export const metadata: Metadata = {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    applicationName: 'Accent Marker',
    appleWebApp: {
        title: 'Accent Marker',
    },
    alternates: {
        canonical: '/',
    },
    formatDetection: {
        telephone: false,
    },
    icons: {
        apple: '/images/logo-128.png',
        icon: '/images/logo.png',
    },
    keywords: [
        'Japanese pitch accent',
        'furigana tool',
        'Japanese pronunciation',
        'Japanese reading aid',
        'pitch accent marker',
        'Japanese learning tool',
    ],
    openGraph: {
        title,
        description,
        images: [
            {
                url: '/images/logo.png',
                alt: 'Accent Marker logo for the Japanese pitch accent and furigana tool',
            },
        ],
        locale: 'en_US',
        siteName: 'Accent Marker',
        type: 'website',
        url: SITE_URL,
    },
    referrer: 'strict-origin-when-cross-origin',
    robots: {
        follow: true,
        index: true,
    },
    twitter: {
        title,
        description,
        card: 'summary',
        images: [
            {
                url: '/images/logo.png',
                alt: 'Accent Marker logo for the Japanese pitch accent and furigana tool',
            },
        ],
        site: '@sessatakuma',
    },
};

export const viewport: Viewport = {
    themeColor: '#619e83',
};

const structuredData = {
    en: buildStructuredData('en'),
    ja: buildStructuredData('ja'),
    zh: buildStructuredData('zh'),
};

export default async function RootLayout({ children }: { children: ReactNode }) {
    const requestHeaders = await headers();
    const locale = resolveLocaleFromHeader(requestHeaders.get(LOCALE_HEADER));
    const structuredDataForLocale = structuredData[locale];

    return (
        <html lang={structuredDataForLocale.inLanguage[0]} className={notoSansJp.variable}>
            <body>
                <script
                    type='application/ld+json'
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify(structuredDataForLocale),
                    }}
                />
                <div id='root'>{children}</div>
            </body>
        </html>
    );
}
