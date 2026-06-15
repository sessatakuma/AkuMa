import {
    buildMarkAccentStreamUrl,
    DEFAULT_MARK_ACCENT_UPSTREAM_URL,
    isMarkAccentProxyLoop,
} from '../../../../../proxy.config.js';
import {
    MAX_ANNOTATION_TEXT_CHARS,
    assertCanUseAccentApi,
    authenticateRequest,
} from '../../../../lib/billing/entitlements';
import { extensionOptionsResponse, getExtensionCorsHeaders } from '../../../../lib/http/extensionCors';

const ALLOWED_DEV_ORIGINS = new Set(['http://localhost:3000', 'http://127.0.0.1:3000']);

function extractRequestOrigin(request: Request) {
    const originHeader = request.headers.get('origin');
    if (originHeader) {
        return originHeader;
    }

    const refererHeader = request.headers.get('referer');
    if (!refererHeader) {
        return null;
    }

    try {
        return new URL(refererHeader).origin;
    } catch {
        return null;
    }
}

function extractRequestHostOrigin(request: Request) {
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host');

    if (!host) {
        return null;
    }

    const protocol =
        request.headers.get('x-forwarded-proto') ||
        (process.env.NODE_ENV === 'production' ? 'https' : 'http');

    return `${protocol}://${host}`;
}

function jsonResponse(status: number, body: { error: string }, headers?: HeadersInit) {
    return Response.json(body, { status, headers });
}

function getAccessDeniedResponse(access: Awaited<ReturnType<typeof assertCanUseAccentApi>>, headers?: HeadersInit) {
    const reason = access.reason;

    if (reason === 'text-too-long') {
        return Response.json(
            {
                error: `Text is too long. Limit each annotation request to ${MAX_ANNOTATION_TEXT_CHARS} characters.`,
                entitlement: access.snapshot,
            },
            {
                status: 413,
                headers,
            },
        );
    }

    if (
        reason === 'rate-minute' ||
        reason === 'rate-hour' ||
        reason === 'rate-day' ||
        reason === 'characters-day'
    ) {
        return Response.json(
            {
                error: 'Pro fair-use limit reached. Please wait and try again later.',
                entitlement: access.snapshot,
            },
            {
                status: 429,
                headers,
            },
        );
    }

    return Response.json(
        {
            error:
                reason === 'free-word-only'
                    ? 'Free usage supports selected Japanese words only'
                    : 'Daily free usage limit reached',
            entitlement: access.snapshot,
        },
        {
            status: 402,
            headers,
        },
    );
}

export async function POST(request: Request) {
    const requestOrigin = extractRequestOrigin(request);
    const requestHostOrigin = extractRequestHostOrigin(request);
    const corsHeaders = getExtensionCorsHeaders(request);
    const isAllowedOrigin =
        requestOrigin === requestHostOrigin ||
        corsHeaders !== undefined ||
        (process.env.NODE_ENV !== 'production' &&
            requestOrigin !== null &&
            ALLOWED_DEV_ORIGINS.has(requestOrigin));

    if (!isAllowedOrigin) {
        return jsonResponse(403, { error: 'Forbidden' }, corsHeaders);
    }

    const account = await authenticateRequest(request);
    if (!account) {
        return jsonResponse(401, { error: 'Unauthorized' }, corsHeaders);
    }

    const apiKey = process.env.MARK_ACCENT_API_KEY;
    if (!apiKey) {
        return jsonResponse(
            500,
            {
                error: 'MARK_ACCENT_API_KEY is not configured',
            },
            corsHeaders,
        );
    }

    try {
        const body = await request.text();
        const requestBody = JSON.parse(body) as { text?: unknown };
        const text = typeof requestBody.text === 'string' ? requestBody.text : '';
        const access = await assertCanUseAccentApi(account.userId, text);

        if (!access.allowed) {
            return getAccessDeniedResponse(access, corsHeaders);
        }

        const baseUpstreamUrl =
            process.env.MARK_ACCENT_UPSTREAM_URL || DEFAULT_MARK_ACCENT_UPSTREAM_URL;
        const requestHost = request.headers.get('host');

        if (isMarkAccentProxyLoop(requestHost, baseUpstreamUrl)) {
            return jsonResponse(
                500,
                {
                    error: 'MARK_ACCENT_UPSTREAM_URL points to this proxy route and causes a loop',
                },
                corsHeaders,
            );
        }

        const upstreamResponse = await fetch(buildMarkAccentStreamUrl(baseUpstreamUrl), {
            method: 'POST',
            headers: {
                'Content-Type': request.headers.get('content-type') || 'application/json',
                'X-API-KEY': apiKey,
            },
            body,
        });

        return new Response(upstreamResponse.body, {
            status: upstreamResponse.status,
            headers: {
                'Cache-Control': 'no-cache, no-transform',
                'Content-Type':
                    upstreamResponse.headers.get('content-type') ||
                    'application/x-ndjson; charset=utf-8',
                ...corsHeaders,
                'X-Accel-Buffering': 'no',
            },
        });
    } catch (error) {
        console.error('MarkAccent stream proxy failed:', error);
        return jsonResponse(502, { error: 'Upstream request failed' }, corsHeaders);
    }
}

export function GET() {
    return jsonResponse(405, { error: 'Method Not Allowed' }, { Allow: 'POST' });
}

export function OPTIONS(request: Request) {
    return extensionOptionsResponse(request);
}
