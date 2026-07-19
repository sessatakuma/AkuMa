'use client';

import { useEffect, useState } from 'react';

import Script from 'next/script';

import './AnalyticsConsent.css';

type Consent = 'granted' | 'denied' | 'pending';

declare global {
    interface Window {
        clarity?: (...args: unknown[]) => void;
    }
}

const CONSENT_STORAGE_KEY = 'akuma-analytics-consent';
const OPEN_PREFERENCES_EVENT = 'akuma:open-analytics-preferences';

function readConsent(): Consent {
    const value = window.localStorage.getItem(CONSENT_STORAGE_KEY);

    return value === 'granted' || value === 'denied' ? value : 'pending';
}

export default function AnalyticsConsent({ msClarityProjectId }: { msClarityProjectId?: string }) {
    const [consent, setConsent] = useState<Consent>('pending');
    const [isReady, setIsReady] = useState(false);
    const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);

    useEffect(() => {
        setConsent(readConsent());
        setIsReady(true);

        const openPreferences = () => setIsPreferencesOpen(true);
        window.addEventListener(OPEN_PREFERENCES_EVENT, openPreferences);

        return () => window.removeEventListener(OPEN_PREFERENCES_EVENT, openPreferences);
    }, []);

    const saveConsent = (value: Exclude<Consent, 'pending'>) => {
        window.localStorage.setItem(CONSENT_STORAGE_KEY, value);

        if (value === 'denied') {
            window.clarity?.('consentv2', {
                ad_Storage: 'denied',
                analytics_Storage: 'denied',
            });
        }

        setConsent(value);
        setIsPreferencesOpen(false);

        if (value === 'denied' && consent === 'granted') {
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
                    role='dialog'
                >
                    <div className='analytics-consent__content'>
                        <h2 id='analytics-consent-title'>Analytics cookies</h2>
                        <p>
                            We use Microsoft Clarity only if you agree, to understand how people use
                            this site through session recordings and heatmaps. You can change your
                            choice at any time.
                        </p>
                        <a href='/privacy'>Privacy &amp; Cookie Policy</a>
                        <div className='analytics-consent__actions'>
                            <button type='button' onClick={() => saveConsent('denied')}>
                                Reject
                            </button>
                            <button type='button' onClick={() => saveConsent('granted')}>
                                {isPreferencesOpen ? 'Save preference' : 'Accept analytics'}
                            </button>
                        </div>
                    </div>
                </section>
            ) : null}
        </>
    );
}
