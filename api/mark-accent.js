import {
    DEFAULT_MARK_ACCENT_UPSTREAM_URL,
    isMarkAccentProxyLoop,
} from '../proxy.config.js';

const ALLOWED_SITE_ORIGIN = 'https://accent-marker.sessatakuma.dev';
const ALLOWED_DEV_ORIGINS = new Set(['http://localhost:3000', 'http://127.0.0.1:3000']);

function extractRequestOrigin(request) {
    const originHeader = request.headers.origin;
    if (originHeader) {
        return originHeader;
    }

    const refererHeader = request.headers.referer;
    if (!refererHeader) {
        return null;
    }

    try {
        return new URL(refererHeader).origin;
    } catch {
        return null;
    }
}

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        response.setHeader('Allow', 'POST');
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    const requestOrigin = extractRequestOrigin(request);
    const isAllowedOrigin =
        requestOrigin === ALLOWED_SITE_ORIGIN ||
        (process.env.NODE_ENV !== 'production' && ALLOWED_DEV_ORIGINS.has(requestOrigin));

    if (!isAllowedOrigin) {
        return response.status(403).json({ error: 'Forbidden' });
    }

    const apiKey = process.env.MARK_ACCENT_API_KEY;
    if (!apiKey) {
        return response.status(500).json({ error: 'MARK_ACCENT_API_KEY is not configured' });
    }

    try {
        const upstreamUrl =
            process.env.MARK_ACCENT_UPSTREAM_URL || DEFAULT_MARK_ACCENT_UPSTREAM_URL;

        if (isMarkAccentProxyLoop(request.headers.host, upstreamUrl)) {
            return response.status(500).json({
                error: 'MARK_ACCENT_UPSTREAM_URL points to this proxy route and causes a loop',
            });
        }

        const upstreamResponse = await fetch(upstreamUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-KEY': apiKey,
            },
            body: JSON.stringify(request.body ?? {}),
        });

        const rawBody = await upstreamResponse.text();
        const contentType = upstreamResponse.headers.get('content-type') || '';

        if (!contentType.includes('application/json')) {
            const snippet = rawBody.slice(0, 160);

            console.error('MarkAccent proxy received non-JSON upstream response:', {
                contentType,
                snippet,
                status: upstreamResponse.status,
                upstreamUrl,
            });

            return response.status(502).json({
                error: 'Upstream returned a non-JSON response',
                snippet,
                status: upstreamResponse.status,
            });
        }

        const data = JSON.parse(rawBody);
        return response.status(upstreamResponse.status).json(data);
    } catch (error) {
        console.error('MarkAccent proxy failed:', error);
        return response.status(502).json({ error: 'Upstream request failed' });
    }
}
