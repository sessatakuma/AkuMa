export function getAllowedExtensionOrigins() {
    return new Set(
        (process.env.AKUMA_EXTENSION_ORIGINS ?? '')
            .split(',')
            .map(origin => origin.trim())
            .filter(Boolean),
    );
}

export function getExtensionCorsHeaders(request: Request): HeadersInit | undefined {
    const requestOrigin = request.headers.get('origin');

    if (!requestOrigin || !requestOrigin.startsWith('chrome-extension://')) {
        return undefined;
    }

    if (!getAllowedExtensionOrigins().has(requestOrigin)) {
        return undefined;
    }

    return {
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Origin': requestOrigin,
        Vary: 'Origin',
    };
}

export function extensionOptionsResponse(request: Request) {
    const corsHeaders = getExtensionCorsHeaders(request);

    if (!corsHeaders) {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    return new Response(null, {
        status: 204,
        headers: corsHeaders,
    });
}
