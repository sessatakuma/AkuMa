'use client';

import { useEffect, useState } from 'react';

import Script from 'next/script';

import { resolveBrowserLocale } from '../i18n';
import { DEFAULT_LOCALE, translations, type Locale } from '../i18nConfig';

import {
    readConsent,
    shouldReloadAfterConsentChange,
    writeConsent,
    type Consent,
} from './analyticsConsentState';

import './AnalyticsConsent.css';

declare global {
    interface Window {
        clarity?: (...args: unknown[]) => void;
    }
}

const OPEN_PREFERENCES_EVENT = 'akuma:open-analytics-preferences';

function hasEditorWork(): boolean {
    return (document.querySelector<HTMLTextAreaElement>('#accent-input')?.value.length ?? 0) > 0;
}

export default function AnalyticsConsent({ msClarityProjectId }: { msClarityProjectId?: string }) {
    const [consent, setConsent] = useState<Consent>('pending');
    const [isReady, setIsReady] = useState(false);
    const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
    const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE);
    const t = translations[locale];

    useEffect(() => {
        setConsent(readConsent([() => window.sessionStorage, () => window.localStorage]));
        setLocale(resolveBrowserLocale(DEFAULT_LOCALE));
        setIsReady(true);

        const openPreferences = () => setIsPreferencesOpen(true);
        window.addEventListener(OPEN_PREFERENCES_EVENT, openPreferences);

        return () => window.removeEventListener(OPEN_PREFERENCES_EVENT, openPreferences);
    }, []);

    const saveConsent = (value: Exclude<Consent, 'pending'>) => {
        const shouldReload = shouldReloadAfterConsentChange(consent, value);
        if (shouldReload && hasEditorWork() && !window.confirm(t.analyticsConsentWithdrawConfirm)) {
            return;
        }

        const isStored = writeConsent(
            value,
            () => window.localStorage,
            () => window.sessionStorage,
        );

        if (value === 'denied') {
            window.clarity?.('consentv2', {
                ad_Storage: 'denied',
                analytics_Storage: 'denied',
            });
        }

        setConsent(value);
        setIsPreferencesOpen(false);

        if (shouldReload && isStored) {
            window.location.reload();
        }
    };

    if (!msClarityProjectId || !isReady) {
        return null;
    }

    const shouldShowBanner = consent === 'pending' || isPreferencesOpen;

    return (
        <>
            {consent === 'granted' ? (
                <Script id='ms-clarity' strategy='afterInteractive'>
                    {`
                        (function(c,l,a,r,i,t,y){
                            c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                            c[a]("consentv2", {analytics_Storage:"granted",ad_Storage:"denied"});
                            t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                            y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
                        })(window, document, "clarity", "script", ${JSON.stringify(msClarityProjectId)});
                    `}
                </Script>
            ) : null}
            {shouldShowBanner ? (
                <section
                    aria-labelledby='analytics-consent-title'
                    className='analytics-consent'
                    role='region'
                >
                    <div className='analytics-consent__content'>
                        <h2 id='analytics-consent-title'>{t.analyticsConsentTitle}</h2>
                        <p>{t.analyticsConsentBody}</p>
                        <a href='/privacy'>{t.analyticsConsentPrivacyLink}</a>
                        {isPreferencesOpen ? (
                            <p className='analytics-consent__current' role='status'>
                                {t.analyticsConsentCurrentLabel}{' '}
                                <strong>
                                    {consent === 'granted'
                                        ? t.analyticsConsentStatusEnabled
                                        : consent === 'denied'
                                          ? t.analyticsConsentStatusDisabled
                                          : t.analyticsConsentStatusNotSelected}
                                </strong>
                            </p>
                        ) : null}
                        <div className='analytics-consent__actions'>
                            <button type='button' onClick={() => saveConsent('denied')}>
                                {t.analyticsConsentReject}
                            </button>
                            <button type='button' onClick={() => saveConsent('granted')}>
                                {t.analyticsConsentAccept}
                            </button>
                        </div>
                    </div>
                </section>
            ) : null}
        </>
    );
}
