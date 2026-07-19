import type { Metadata } from 'next';

import './privacy.css';

export const metadata: Metadata = {
    title: 'Privacy & Cookie Policy | AkuMa',
    description: 'How AkuMa uses analytics and manages your privacy choices.',
};

export default function PrivacyPage() {
    return (
        <main className='privacy-page'>
            <a className='privacy-page__back' href='/'>
                Back to AkuMa
            </a>
            <h1>Privacy &amp; Cookie Policy</h1>
            <p>Last updated: July 19, 2026</p>

            <section>
                <h2>Analytics</h2>
                <p>
                    AkuMa uses Microsoft Clarity only after you choose to accept analytics cookies.
                    Clarity helps us understand how visitors use the site through aggregated
                    heatmaps and session recordings, so we can improve the product.
                </p>
            </section>

            <section>
                <h2>What Clarity may collect</h2>
                <p>
                    When analytics is enabled, Clarity may process page activity such as clicks,
                    scrolling, mouse movement, page rendering, and session replay data. AkuMa masks
                    the text input and analysis result from Clarity recordings. Do not enter
                    personal or sensitive information.
                </p>
            </section>

            <section>
                <h2>Cookies and your choices</h2>
                <p>
                    Clarity uses analytics cookies to recognize a browser across pages and sessions.
                    You can accept or reject analytics when the banner appears, and change your
                    choice at any time through the Manage analytics link in the site footer.
                    Rejecting analytics prevents Clarity from loading on subsequent page visits.
                </p>
            </section>

            <section>
                <h2>Service provider</h2>
                <p>
                    Microsoft Clarity provides the analytics service. Its processing is subject to
                    the{' '}
                    <a
                        href='https://privacy.microsoft.com/privacystatement'
                        rel='noreferrer'
                        target='_blank'
                    >
                        Microsoft Privacy Statement
                    </a>
                    .
                </p>
            </section>

            <section>
                <h2>Contact</h2>
                <p>
                    For privacy questions, contact{' '}
                    <a href='mailto:contact@sessatakuma.dev'>contact@sessatakuma.dev</a>.
                </p>
            </section>
        </main>
    );
}
