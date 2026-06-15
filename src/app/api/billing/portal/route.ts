import { authenticateRequest } from '../../../../lib/billing/entitlements';
import { getAppUrl, getStripe } from '../../../../lib/billing/stripe';
import { extensionOptionsResponse, getExtensionCorsHeaders } from '../../../../lib/http/extensionCors';
import { createSupabaseServiceClient } from '../../../../lib/supabase/server';

export async function POST(request: Request) {
    const corsHeaders = getExtensionCorsHeaders(request);
    const account = await authenticateRequest(request);
    if (!account) {
        return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
    }

    const supabase = createSupabaseServiceClient();
    const { data: profile, error } = await supabase
        .from('akuma_profiles')
        .select('stripe_customer_id')
        .eq('user_id', account.userId)
        .maybeSingle<{ stripe_customer_id: string | null }>();

    if (error) {
        throw error;
    }

    if (!profile?.stripe_customer_id) {
        return Response.json({ error: 'Stripe customer not found' }, { status: 404, headers: corsHeaders });
    }

    const portalSession = await getStripe().billingPortal.sessions.create({
        customer: profile.stripe_customer_id,
        return_url: `${getAppUrl()}/extension`,
    });

    return Response.json({ url: portalSession.url }, { headers: corsHeaders });
}

export function OPTIONS(request: Request) {
    return extensionOptionsResponse(request);
}
