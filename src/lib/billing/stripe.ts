import Stripe from 'stripe';

export type BillingInterval = 'month' | 'year';

export function getStripe() {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
        throw new Error('STRIPE_SECRET_KEY is not configured');
    }

    return new Stripe(secretKey, {
        apiVersion: '2026-05-27.dahlia',
        typescript: true,
    });
}

export function getStripeProPriceId(interval: BillingInterval) {
    const envName =
        interval === 'year' ? 'STRIPE_PRO_ANNUAL_PRICE_ID' : 'STRIPE_PRO_MONTHLY_PRICE_ID';
    const value =
        process.env[envName] || (interval === 'month' ? process.env.STRIPE_PRO_PRICE_ID : undefined);
    if (!value) {
        throw new Error(`${envName} is not configured`);
    }
    return value;
}

export function parseBillingInterval(value: unknown): BillingInterval {
    return value === 'month' ? 'month' : 'year';
}

export function getAppUrl() {
    return (process.env.NEXT_PUBLIC_APP_URL || 'https://akuma.sessatakuma.dev').replace(/\/$/u, '');
}
