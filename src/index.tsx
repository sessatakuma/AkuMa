import { Analytics } from '@vercel/analytics/react';
import { createRoot } from 'react-dom/client';

import Main from './components/Main';
import { I18nProvider } from './i18n';
import './index.css';

const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    root.render(
        <I18nProvider>
            <Main />
            <Analytics />
        </I18nProvider>,
    );
}
