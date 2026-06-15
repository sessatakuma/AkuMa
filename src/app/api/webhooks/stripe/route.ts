import Stripe from 'stripe';

import { getStripe } from '../../../../lib/billing/stripe';
import { createSupabaseServiceClient } from '../../../../lib/supabase/server';

type SupabaseServiceClient = ReturnType<typeof createSupabaseServiceClient>;

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
        await syncStripeEvent(stripe, event);
    }

    return Response.json({ received: true });
}

async function syncStripeEvent(stripe: Stripe, event: Stripe.Event) {
    const supabase = createSupabaseServiceClient();

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        await syncCheckoutSession(stripe, supabase, session);
        return;
    }

    const subscription = event.data.object as Stripe.Subscription;
    await syncSubscription(stripe, supabase, subscription);
}

async function syncCheckoutSession(
    stripe: Stripe,
    supabase: SupabaseServiceClient,
    session: Stripe.Checkout.Session,
) {
    const customerId = getStripeObjectId(session.customer);
    const userId = await resolveStripeUserId(
        stripe,
        supabase,
        customerId,
        session.metadata?.supabase_user_id ?? session.client_reference_id,
    );

    if (userId && customerId) {
        await upsertProfile(supabase, {
            customerId,
            email: session.customer_details?.email ?? null,
            userId,
        });
    }

    const subscriptionId = getStripeObjectId(session.subscription);
    if (!subscriptionId) {
        return;
    }

    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    await syncSubscription(stripe, supabase, subscription, {
        fallbackEmail: session.customer_details?.email ?? null,
        fallbackUserId: userId,
    });
}

async function syncSubscription(
    stripe: Stripe,
    supabase: SupabaseServiceClient,
    subscription: Stripe.Subscription,
    options: { fallbackEmail?: string | null; fallbackUserId?: string | null } = {},
) {
    const customerId = getStripeObjectId(subscription.customer);
    const userId = await resolveStripeUserId(
        stripe,
        supabase,
        customerId,
        subscription.metadata.supabase_user_id || options.fallbackUserId,
    );

    if (userId && customerId) {
        await upsertProfile(supabase, {
            customerId,
            email: options.fallbackEmail ?? null,
            userId,
        });
    }

    if (!userId || !customerId) {
        console.warn('Skipping Stripe subscription sync without a Supabase user id', {
            customerId,
            subscriptionId: subscription.id,
        });
        return;
    }

    const firstItem = subscription.items.data[0];
    const currentPeriodEnd = getSubscriptionCurrentPeriodEnd(subscription);
    const { error } = await supabase.from('akuma_subscriptions').upsert({
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

async function resolveStripeUserId(
    stripe: Stripe,
    supabase: SupabaseServiceClient,
    customerId: string | null,
    metadataUserId: string | null | undefined,
) {
    if (metadataUserId) {
        return metadataUserId;
    }

    if (!customerId) {
        return null;
    }

    const { data: profile, error } = await supabase
        .from('akuma_profiles')
        .select('user_id')
        .eq('stripe_customer_id', customerId)
        .maybeSingle<{ user_id: string }>();

    if (error) {
        throw error;
    }

    if (profile?.user_id) {
        return profile.user_id;
    }

    const customer = await stripe.customers.retrieve(customerId);
    if (!customer.deleted && customer.metadata.supabase_user_id) {
        return customer.metadata.supabase_user_id;
    }

    return null;
}

async function upsertProfile(
    supabase: SupabaseServiceClient,
    values: {
        customerId: string;
        email: string | null;
        userId: string;
    },
) {
    const { data: existingProfile, error: profileError } = await supabase
        .from('akuma_profiles')
        .select('email')
        .eq('user_id', values.userId)
        .maybeSingle<{ email: string | null }>();

    if (profileError) {
        throw profileError;
    }

    const { error } = await supabase.from('akuma_profiles').upsert({
        email: values.email ?? existingProfile?.email ?? null,
        stripe_customer_id: values.customerId,
        updated_at: new Date().toISOString(),
        user_id: values.userId,
    });

    if (error) {
        throw error;
    }
}

function getStripeObjectId(value: string | { id: string } | null | undefined) {
    if (!value) {
        return null;
    }

    return typeof value === 'string' ? value : value.id;
}

function getSubscriptionCurrentPeriodEnd(subscription: Stripe.Subscription) {
    const firstItem = subscription.items.data[0];
    return (
        (subscription as unknown as { current_period_end?: number }).current_period_end ??
        (firstItem as unknown as { current_period_end?: number } | undefined)?.current_period_end ??
        null
    );
}
