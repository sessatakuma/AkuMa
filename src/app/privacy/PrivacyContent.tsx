'use client';

import Footer from '../../components/Footer';
import Nav from '../../components/Nav';
import { I18nProvider, useI18n } from '../../i18n';

import type { Locale } from '../../i18nConfig';

function PrivacyArticle() {
    const { t } = useI18n();
    const emailAddress = 'contact@sessatakuma.dev';

    return (
        <article className='privacy-page__content'>
            <h1>{t.privacyTitle}</h1>
            <p>{t.privacyLastUpdated}</p>

            <section>
                <h2>{t.privacyAnalyticsTitle}</h2>
                <p>{t.privacyAnalyticsBody}</p>
            </section>

            <section>
                <h2>{t.privacyCollectionTitle}</h2>
                <p>{t.privacyCollectionBody}</p>
            </section>

            <section>
                <h2>{t.privacyCookiesTitle}</h2>
                <p>{t.privacyCookiesBody}</p>
            </section>

            <section>
                <h2>{t.privacyProviderTitle}</h2>
                <p>
                    {t.privacyProviderBodyPrefix}
                    <a
                        href='https://privacy.microsoft.com/privacystatement'
                        rel='noreferrer'
                        target='_blank'
                    >
                        {t.privacyProviderLink}
                    </a>
                    {t.privacyProviderBodySuffix}
                </p>
            </section>

            <section>
                <h2>{t.privacyContactTitle}</h2>
                <p>
                    {t.privacyContactBodyPrefix}
                    <a href={`mailto:${emailAddress}`}>{emailAddress}</a>
                    {t.privacyContactBodySuffix}
                </p>
            </section>
        </article>
    );
}

export default function PrivacyContent({ initialLocale }: { initialLocale: Locale }) {
    return (
        <I18nProvider initialLocale={initialLocale}>
            <div className='privacy-shell'>
                <Nav homeHref='/' showGuide={false} />
                <main id='main-content' className='privacy-page'>
                    <PrivacyArticle />
                </main>
                <Footer showPrivacyLink={false} />
            </div>
        </I18nProvider>
    );
}
