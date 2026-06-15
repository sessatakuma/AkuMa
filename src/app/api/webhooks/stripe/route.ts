import Stripe from 'stripe';

import { getStripe } from '../../../../lib/billing/stripe';
import { createSupabaseServiceClient } from '../../../../lib/supabase/server';

export async function POST(request: Request) {
    const stripe = getStripe();
    const signature = request.headers.get('stripe-signature');
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!signature || !webhookSecret) {
        return Response.json({ error: 'Stripe webhook is not configured' }, { status: 400 });
    }

    let event: Stripe.Event;
    try {
        event = stripe.webhooks.constructEvent(await request.text(), signature, webhookSecret);
    } catch {
        return Response.json({ error: 'Invalid Stripe signature' }, { status: 400 });
    }

    if (
        event.type === 'checkout.session.completed' ||
        event.type === 'customer.subscription.created' ||
        event.type === 'customer.subscription.updated' ||
        event.type === 'customer.subscription.deleted'
    ) {
        await syncStripeEvent(event);
    }

    return Response.json({ received: true });
}

async function syncStripeEvent(event: Stripe.Event) {
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.supabase_user_id;
        const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;

        if (userId && customerId) {
            await createSupabaseServiceClient().from('akuma_profiles').upsert({
                email: session.customer_details?.email ?? null,
                stripe_customer_id: customerId,
                updated_at: new Date().toISOString(),
                user_id: userId,
            });
        }
        return;
    }

    const subscription = event.data.object as Stripe.Subscription;
    const userId = subscription.metadata.supabase_user_id;
    const customerId =
        typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;

    if (!userId) {
        return;
    }

    const firstItem = subscription.items.data[0];
    const currentPeriodEnd =
        (subscription as unknown as { current_period_end?: number }).current_period_end ??
        (firstItem as unknown as { current_period_end?: number } | undefined)?.current_period_end;
    const { error } = await createSupabaseServiceClient().from('akuma_subscriptions').upsert({
        current_period_end: currentPeriodEnd ? new Date(currentPeriodEnd * 1000).toISOString() : null,
        price_id: firstItem?.price.id ?? null,
        status: subscription.status,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscription.id,
        updated_at: new Date().toISOString(),
        user_id: userId,
    });

    if (error) {
        throw error;
    }
}
