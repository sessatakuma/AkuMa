import { BadgeCheck, Chrome, Highlighter, Infinity as InfinityIcon, MousePointer2 } from 'lucide-react';

import { useAuth } from '../auth/AuthContext';

import './ChromeExtensionSection.css';

export default function ChromeExtensionSection() {
    const { isBillingBusy, isPro, startCheckout, user } = useAuth();

    return (
        <section className='chrome-extension-section' aria-labelledby='chrome-extension-heading'>
            <div className='chrome-extension-inner'>
                <div className='chrome-extension-copy'>
                    <span className='chrome-extension-eyebrow'>
                        <Chrome size={18} aria-hidden='true' />
                        Chrome extension
                    </span>
                    <h2 id='chrome-extension-heading'>Get annotations directly in Chrome</h2>
                    <p>
                        Add furigana and pitch accent while reading Japanese pages. Free accounts can
                        annotate selected words up to 50 times per day; Pro unlocks full-page and
                        sentence annotation.
                    </p>
                    <div className='chrome-extension-actions'>
                        {user ? (
                            isPro ? (
                                <button
                                    type='button'
                                    className='chrome-extension-primary'
                                    disabled
                                >
                                    Pro active
                                </button>
                            ) : (
                                <>
                                    <button
                                        type='button'
                                        className='chrome-extension-primary'
                                        disabled={isBillingBusy}
                                        onClick={() => void startCheckout('year')}
                                    >
                                        Get Pro yearly
                                    </button>
                                    <button
                                        type='button'
                                        className='chrome-extension-secondary'
                                        disabled={isBillingBusy}
                                        onClick={() => void startCheckout('month')}
                                    >
                                        Monthly
                                    </button>
                                </>
                            )
                        ) : (
                            <a className='chrome-extension-primary' href='#main-content'>
                                Sign in to start
                            </a>
                        )}
                        <span className='chrome-extension-price'>Annual Pro is $49/year.</span>
                    </div>
                </div>
                <div className='chrome-extension-plan-grid' aria-label='Chrome extension plans'>
                    <article>
                        <h3>Free</h3>
                        <ul>
                            <li>
                                <MousePointer2 size={16} aria-hidden='true' />
                                Selected Japanese word only
                            </li>
                            <li>
                                <BadgeCheck size={16} aria-hidden='true' />
                                50 annotations per day
                            </li>
                        </ul>
                    </article>
                    <article>
                        <h3>Pro</h3>
                        <ul>
                            <li>
                                <InfinityIcon size={16} aria-hidden='true' />
                                Unlimited usage
                            </li>
                            <li>
                                <Chrome size={16} aria-hidden='true' />
                                Auto-annotate Japanese pages
                            </li>
                            <li>
                                <Highlighter size={16} aria-hidden='true' />
                                JLPT highlighting TODO
                            </li>
                        </ul>
                        <p className='chrome-extension-fair-use'>
                            Unlimited annotation is subject to fair-use and anti-abuse safeguards.
                        </p>
                    </article>
                </div>
            </div>
        </section>
    );
}
