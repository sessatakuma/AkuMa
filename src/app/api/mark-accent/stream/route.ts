import {
    buildMarkAccentStreamUrl,
    DEFAULT_MARK_ACCENT_UPSTREAM_URL,
    isMarkAccentProxyLoop,
} from '../../../../../proxy.config.js';

const ALLOWED_DEV_ORIGINS = new Set(['http://localhost:3000', 'http://127.0.0.1:3000']);

function getAllowedExtensionOrigins() {
    return new Set(
        (process.env.AKUMA_EXTENSION_ORIGINS ?? '')
            .split(',')
            .map(origin => origin.trim())
            .filter(Boolean),
    );
}

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

function getCorsHeaders(requestOrigin: string | null): HeadersInit | undefined {
    if (!requestOrigin || !requestOrigin.startsWith('chrome-extension://')) {
        return undefined;
    }

    const allowedExtensionOrigins = getAllowedExtensionOrigins();
    if (!allowedExtensionOrigins.has(requestOrigin)) {
        return undefined;
    }

    return {
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Origin': requestOrigin,
        Vary: 'Origin',
    };
}

export async function POST(request: Request) {
    const requestOrigin = extractRequestOrigin(request);
    const requestHostOrigin = extractRequestHostOrigin(request);
    const corsHeaders = getCorsHeaders(requestOrigin);
    const isAllowedOrigin =
        requestOrigin === requestHostOrigin ||
        corsHeaders !== undefined ||
        (process.env.NODE_ENV !== 'production' &&
            requestOrigin !== null &&
            ALLOWED_DEV_ORIGINS.has(requestOrigin));

    if (!isAllowedOrigin) {
        return jsonResponse(403, { error: 'Forbidden' }, corsHeaders);
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
            body: await request.text(),
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
    const requestOrigin = extractRequestOrigin(request);
    const corsHeaders = getCorsHeaders(requestOrigin);

    if (!corsHeaders) {
        return jsonResponse(403, { error: 'Forbidden' });
    }

    return new Response(null, {
        status: 204,
        headers: corsHeaders,
    });
}
