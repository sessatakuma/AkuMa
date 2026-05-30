import {
    buildMarkAccentStreamUrl,
    DEFAULT_MARK_ACCENT_UPSTREAM_URL,
    isMarkAccentProxyLoop,
} from '../../proxy.config.js';

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
        const baseUpstreamUrl =
            process.env.MARK_ACCENT_UPSTREAM_URL || DEFAULT_MARK_ACCENT_UPSTREAM_URL;

        if (isMarkAccentProxyLoop(request.headers.host, baseUpstreamUrl)) {
            return response.status(500).json({
                error: 'MARK_ACCENT_UPSTREAM_URL points to this proxy route and causes a loop',
            });
        }

        const streamUpstreamUrl = buildMarkAccentStreamUrl(baseUpstreamUrl);

        const upstreamResponse = await fetch(streamUpstreamUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-KEY': apiKey,
            },
            body: JSON.stringify(request.body ?? {}),
        });

        response.status(upstreamResponse.status);
        response.setHeader(
            'Content-Type',
            upstreamResponse.headers.get('content-type') ||
                'application/x-ndjson; charset=utf-8',
        );
        response.setHeader('Cache-Control', 'no-cache, no-transform');
        response.setHeader('X-Accel-Buffering', 'no');

        if (!upstreamResponse.body) {
            response.end(await upstreamResponse.text());
            return;
        }

        const reader = upstreamResponse.body.getReader();
        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                break;
            }
            if (value && value.byteLength > 0) {
                response.write(value);
            }
        }
        response.end();
    } catch (error) {
        console.error('MarkAccent stream proxy failed:', error);
        return response.status(502).json({ error: 'Upstream request failed' });
    }
}
