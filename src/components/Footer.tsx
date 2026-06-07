import { Facebook, Instagram, Mail } from 'lucide-react';

import './Footer.css';

import { useI18n } from '../i18n';

function ThreadsIcon({ size = 24 }: { size?: number }) {
    return (
        <svg
            aria-hidden='true'
            className='footer-social-svg'
            focusable='false'
            height={size}
            viewBox='0 0 24 24'
            width={size}
        >
            <path
                d='M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.964-.065-1.19.408-2.285 1.33-3.082.88-.76 2.119-1.207 3.583-1.291a13.853 13.853 0 0 1 3.02.142c-.126-.742-.375-1.332-.75-1.757-.513-.586-1.308-.883-2.359-.89h-.029c-.844 0-1.992.232-2.721 1.32L7.734 7.847c.98-1.454 2.568-2.256 4.478-2.256h.044c3.194.02 5.097 1.975 5.287 5.388.108.046.216.094.321.142 1.49.7 2.58 1.761 3.154 3.07.797 1.82.871 4.79-1.548 7.158-1.85 1.81-4.094 2.628-7.277 2.65Zm1.003-11.69c-.242 0-.487.007-.739.021-1.836.103-2.98.946-2.916 2.143.067 1.256 1.452 1.839 2.784 1.767 1.224-.065 2.818-.543 3.086-3.71a10.5 10.5 0 0 0-2.215-.221z'
                fill='currentColor'
            />
        </svg>
    );
}

function GithubIcon({ size = 24 }: { size?: number }) {
    return (
        <svg
            aria-hidden='true'
            className='footer-social-svg'
            focusable='false'
            height={size}
            viewBox='0 0 1024 1024'
            width={size}
        >
            <path
                clipRule='evenodd'
                d='M8 0C3.58 0 0 3.58 0 8C0 11.54 2.29 14.53 5.47 15.59C5.87 15.66 6.02 15.42 6.02 15.21C6.02 15.02 6.01 14.39 6.01 13.72C4 14.09 3.48 13.23 3.32 12.78C3.23 12.55 2.84 11.84 2.5 11.65C2.22 11.5 1.82 11.13 2.49 11.12C3.12 11.11 3.57 11.7 3.72 11.94C4.44 13.15 5.59 12.81 6.05 12.6C6.12 12.08 6.33 11.73 6.56 11.53C4.78 11.33 2.92 10.64 2.92 7.58C2.92 6.71 3.23 5.99 3.74 5.43C3.66 5.23 3.38 4.41 3.82 3.31C3.82 3.31 4.49 3.1 6.02 4.13C6.66 3.95 7.34 3.86 8.02 3.86C8.7 3.86 9.38 3.95 10.02 4.13C11.55 3.09 12.22 3.31 12.22 3.31C12.66 4.41 12.38 5.23 12.3 5.43C12.81 5.99 13.12 6.7 13.12 7.58C13.12 10.65 11.25 11.33 9.47 11.53C9.76 11.78 10.01 12.26 10.01 13.01C10.01 14.08 10 14.94 10 15.21C10 15.42 10.15 15.67 10.55 15.59C13.71 14.53 16 11.53 16 8C16 3.58 12.42 0 8 0Z'
                fill='currentColor'
                fillRule='evenodd'
                transform='scale(64)'
            />
        </svg>
    );
}

export default function Footer() {
    const { t } = useI18n();
    const socialLinks = [
        {
            icon: <Instagram size={24} />,
            label: t.footerInstagramLabel,
            pending: true,
        },
        {
            icon: <ThreadsIcon size={24} />,
            label: t.footerThreadsLabel,
            pending: true,
        },
        {
            icon: <Facebook size={24} />,
            label: t.footerFacebookLabel,
            pending: true,
        },
        {
            href: 'mailto:contact@sessatakuma.dev',
            icon: <Mail size={24} />,
            label: t.footerMailLabel,
        },
        {
            href: 'https://github.com/sessatakuma',
            icon: <GithubIcon size={24} />,
            label: t.footerGithubLabel,
        },
    ];
    const showPendingAccountDialog = () => {
        window.alert(t.footerSocialPendingMessage);
    };

    return (
        <footer className='site-footer'>
            <div className='site-footer-inner'>
                <div className='site-footer-top'>
                    <a
                        className='site-footer-brand'
                        href='#main-content'
                        aria-label={t.faviconAltBrand}
                    >
                        <img
                            className='site-footer-logo'
                            src='images/logo-128.png'
                            srcSet='images/logo-64.png 64w, images/logo-128.png 128w, images/logo.png 650w'
                            sizes='64px'
                            width='128'
                            height='128'
                            alt=''
                            aria-hidden='true'
                        />
                    </a>
                    <nav className='site-footer-social' aria-labelledby='footer-social-heading'>
                        <h2 id='footer-social-heading'>{t.footerSocialHeading}</h2>
                        <div className='site-footer-social-links'>
                            {socialLinks.map(link =>
                                link.pending ? (
                                    <button
                                        key={link.label}
                                        className='site-footer-social-link'
                                        type='button'
                                        aria-label={link.label}
                                        onClick={showPendingAccountDialog}
                                    >
                                        {link.icon}
                                    </button>
                                ) : (
                                    <a
                                        key={link.label}
                                        className='site-footer-social-link'
                                        href={link.href}
                                        aria-label={link.label}
                                    >
                                        {link.icon}
                                    </a>
                                ),
                            )}
                        </div>
                    </nav>
                </div>

                <section className='site-footer-about' aria-label={t.faviconAltBrand}>
                    <p>{t.footerWhatBody}</p>
                </section>
            </div>
            <p className='site-footer-wordmark' aria-label='Sessatakuma'>
                <span>Sessa</span>
                <span>takuma</span>
            </p>
        </footer>
    );
}
