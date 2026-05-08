const DEFAULT_UPSTREAM_URL = 'https://accent-marker.hsichen.dev/api/mark-accent';

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
        const upstreamUrl = process.env.MARK_ACCENT_UPSTREAM_URL || DEFAULT_UPSTREAM_URL;
        const upstreamResponse = await fetch(upstreamUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-KEY': apiKey,
            },
            body: JSON.stringify(request.body ?? {}),
        });

        const data = await upstreamResponse.json();
        return response.status(upstreamResponse.status).json(data);
    } catch (error) {
        console.error('MarkAccent proxy failed:', error);
        return response.status(502).json({ error: 'Upstream request failed' });
    }
}
