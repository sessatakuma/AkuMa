import { authenticateRequest, getEntitlementSnapshot } from '../../../lib/billing/entitlements';
import { extensionOptionsResponse, getExtensionCorsHeaders } from '../../../lib/http/extensionCors';

export async function GET(request: Request) {
    const corsHeaders = getExtensionCorsHeaders(request);
    const account = await authenticateRequest(request);
    if (!account) {
        return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
    }

    const entitlement = await getEntitlementSnapshot(account.user.id);

    return Response.json(
        {
            email: account.user.email ?? null,
            ...entitlement,
        },
        {
            headers: corsHeaders,
        },
    );
}

export function OPTIONS(request: Request) {
    return extensionOptionsResponse(request);
}
