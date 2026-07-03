'use client';

import Main from './components/Main';
import { I18nProvider } from './i18n';

import type { Locale } from './i18nConfig';

export default function App({ initialLocale }: { initialLocale?: Locale }) {
    return (
        <I18nProvider initialLocale={initialLocale}>
            <Main />
        </I18nProvider>
    );
}
