export const MARK_ACCENT_STREAM_PROXY_PATH = '/api/mark-accent/stream';
export const DEFAULT_MARK_ACCENT_UPSTREAM_URL = 'https://api.sessatakuma.dev/v1/mark-accent';

export function normalizeMarkAccentUrl(value) {
    return value.replace(/\/$/, '');
}

export function buildMarkAccentStreamUrl(upstreamUrl) {
    const normalized = normalizeMarkAccentUrl(upstreamUrl);
    return `${normalized}/stream/`;
}

export function isMarkAccentProxyLoop(requestHost, upstreamUrl) {
    if (!requestHost) {
        return false;
    }

    const currentStreamUrl = new URL(`https://${requestHost}${MARK_ACCENT_STREAM_PROXY_PATH}`);
    const parsedStreamUpstreamUrl = new URL(buildMarkAccentStreamUrl(upstreamUrl));

    return (
        parsedStreamUpstreamUrl.host === currentStreamUrl.host &&
        normalizeMarkAccentUrl(parsedStreamUpstreamUrl.pathname) === MARK_ACCENT_STREAM_PROXY_PATH
    );
}
