export const MARK_ACCENT_PROXY_PATH = '/api/mark-accent';
export const DEFAULT_MARK_ACCENT_PUBLIC_PROXY_TARGET = 'https://accent-marker.hsichen.dev';
export const DEFAULT_MARK_ACCENT_UPSTREAM_URL = 'https://api.sessatakuma.dev/api/MarkAccent/';

export function normalizeMarkAccentUrl(value) {
    return value.replace(/\/$/, '');
}

export function isMarkAccentProxyLoop(requestHost, upstreamUrl) {
    if (!requestHost) {
        return false;
    }

    const currentUrl = new URL(`https://${requestHost}${MARK_ACCENT_PROXY_PATH}`);
    const parsedUpstreamUrl = new URL(upstreamUrl);

    return (
        parsedUpstreamUrl.host === currentUrl.host &&
        normalizeMarkAccentUrl(parsedUpstreamUrl.pathname) === MARK_ACCENT_PROXY_PATH
    );
}
