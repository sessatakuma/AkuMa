'use client';

import { Analytics } from '@vercel/analytics/react';

import { AuthProvider } from './auth/AuthContext';
import Main from './components/Main';
import { I18nProvider } from './i18n';

import type { Locale } from './i18nConfig';

const isVercelDeployment = process.env.NEXT_PUBLIC_VERCEL_ENV !== undefined;

export default function App({ initialLocale }: { initialLocale?: Locale }) {
    return (
        <I18nProvider initialLocale={initialLocale}>
            <AuthProvider>
                <Main />
            </AuthProvider>
            {isVercelDeployment ? <Analytics /> : null}
        </I18nProvider>
    );
}
