import './UsageSection.css';

import { useI18n } from '../i18n';

export default function UsageSection() {
    const { t } = useI18n();

    return (
        <section className='usage-section' aria-labelledby='usage-heading'>
            <div className='usage-section-grid'>
                <div className='usage-section-copy'>
                    <p className='usage-section-eyebrow'>{t.usageEyebrow}</p>
                    <h2 id='usage-heading'>{t.usageHeading}</h2>
                    <p>{t.usageIntro}</p>
                </div>
                <div className='usage-section-details'>
                    <ol className='usage-section-steps'>
                        <li>{t.usageStepOne}</li>
                        <li>{t.usageStepTwo}</li>
                        <li>{t.usageStepThree}</li>
                    </ol>
                    <p className='usage-section-note'>
                        {t.usageImageTip}{' '}
                        <a
                            href='https://squoosh.app'
                            target='_blank'
                            rel='noreferrer noopener'
                        >
                            squoosh.app
                        </a>
                        .
                    </p>
                </div>
            </div>
        </section>
    );
}
