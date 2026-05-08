import {
    DEFAULT_MARK_ACCENT_UPSTREAM_URL,
    isMarkAccentProxyLoop,
} from '../config/mark-accent.js';

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        response.setHeader('Allow', 'POST');
        return response.status(405).json({ error: 'Method Not Allowed' });
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
