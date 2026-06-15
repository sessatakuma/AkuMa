import { exchangeExtensionAuthCode } from '../../../../lib/auth/extensionTokens';
import { extensionOptionsResponse, getExtensionCorsHeaders } from '../../../../lib/http/extensionCors';

export async function POST(request: Request) {
    const corsHeaders = getExtensionCorsHeaders(request);
    if (!corsHeaders) {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = (await request.json()) as {
        code?: unknown;
        redirectUrl?: unknown;
    };
    const code = typeof body.code === 'string' ? body.code : '';
    const redirectUrl = typeof body.redirectUrl === 'string' ? body.redirectUrl : '';

    if (!code || !redirectUrl) {
        return Response.json({ error: 'code and redirectUrl are required' }, { status: 400, headers: corsHeaders });
    }

    const session = await exchangeExtensionAuthCode(code, redirectUrl);
    if (!session) {
        return Response.json({ error: 'Invalid or expired auth code' }, { status: 401, headers: corsHeaders });
    }

    return Response.json(session, { headers: corsHeaders });
}

export function OPTIONS(request: Request) {
    return extensionOptionsResponse(request);
}
