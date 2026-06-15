import { authenticateRequest } from '../../../../lib/billing/entitlements';
import { getAppUrl, getStripe, getStripeProPriceId } from '../../../../lib/billing/stripe';
import { extensionOptionsResponse, getExtensionCorsHeaders } from '../../../../lib/http/extensionCors';
import { createSupabaseServiceClient } from '../../../../lib/supabase/server';

export async function POST(request: Request) {
    const corsHeaders = getExtensionCorsHeaders(request);
    const account = await authenticateRequest(request);
    if (!account) {
        return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
    }

    const supabase = createSupabaseServiceClient();
    const stripe = getStripe();
    const appUrl = getAppUrl();

    const { data: profile, error: profileError } = await supabase
        .from('akuma_profiles')
        .select('stripe_customer_id')
        .eq('user_id', account.user.id)
        .maybeSingle<{ stripe_customer_id: string | null }>();

    if (profileError) {
        throw profileError;
    }

    let customerId = profile?.stripe_customer_id ?? null;
    if (!customerId) {
        const customer = await stripe.customers.create({
            email: account.user.email ?? undefined,
            metadata: {
                supabase_user_id: account.user.id,
            },
        });
        customerId = customer.id;

        const { error } = await supabase.from('akuma_profiles').upsert({
            email: account.user.email ?? null,
            stripe_customer_id: customerId,
            updated_at: new Date().toISOString(),
            user_id: account.user.id,
        });

        if (error) {
            throw error;
        }
    }

    const session = await stripe.checkout.sessions.create({
        allow_promotion_codes: true,
        cancel_url: `${appUrl}/extension?checkout=cancelled`,
        customer: customerId,
        line_items: [
            {
                price: getStripeProPriceId(),
                quantity: 1,
            },
        ],
        mode: 'subscription',
        success_url: `${appUrl}/extension?checkout=success`,
        subscription_data: {
            metadata: {
                supabase_user_id: account.user.id,
            },
        },
    });

    return Response.json({ url: session.url }, { headers: corsHeaders });
}

export function OPTIONS(request: Request) {
    return extensionOptionsResponse(request);
}
