import Stripe from 'stripe';

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

export function getStripeProPriceId() {
    const value = process.env.STRIPE_PRO_PRICE_ID;
    if (!value) {
        throw new Error('STRIPE_PRO_PRICE_ID is not configured');
    }
    return value;
}

export function getAppUrl() {
    return (process.env.NEXT_PUBLIC_APP_URL || 'https://akuma.sessatakuma.dev').replace(/\/$/u, '');
}
