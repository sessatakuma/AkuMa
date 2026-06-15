import { createExtensionAuthCode } from '../../../../lib/auth/extensionTokens';
import { authenticateRequest } from '../../../../lib/billing/entitlements';

export async function POST(request: Request) {
    const account = await authenticateRequest(request);
    if (!account) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as { redirectUrl?: unknown };
    const redirectUrl = typeof body.redirectUrl === 'string' ? body.redirectUrl : '';
    if (!redirectUrl) {
        return Response.json({ error: 'redirectUrl is required' }, { status: 400 });
    }

    const code = await createExtensionAuthCode(account.userId, redirectUrl);
    const finalRedirectUrl = new URL(redirectUrl);
    finalRedirectUrl.searchParams.set('code', code);

    return Response.json({
        redirectUrl: finalRedirectUrl.toString(),
    });
}
