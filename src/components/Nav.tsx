import './Nav.css';

import { BookOpenText } from 'lucide-react';

import AuthControls from '../auth/AuthControls';
import { useI18n } from '../i18n';

export default function Nav() {
    const { t } = useI18n();

    return (
        <header className='nav'>
            <div className='nav-brand' aria-label={t.brandLabel}>
                <a className='nav-title' href='#main-content'>
                    <img
                        className='logo'
                        src='images/logo-64.png'
                        srcSet='images/logo-64.png 64w, images/logo-128.png 128w, images/logo.png 650w'
                        sizes='32px'
                        width='64'
                        height='64'
                        alt=''
                        aria-hidden='true'
                    />
                    <span className='title'>{t.brandLabel}</span>
                </a>
            </div>
            <a
                className='nav-guide-button'
                href='#usage-guide'
                title={t.usageEyebrow}
                aria-label={`${t.usageEyebrow}: ${t.usageHeading}`}
            >
                <BookOpenText size={20} aria-hidden='true' />
                <span className='nav-guide-button-label'>{t.usageGuideButton}</span>
            </a>
            <AuthControls />
        </header>
    );
}
