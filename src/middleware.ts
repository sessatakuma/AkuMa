import { NextResponse, type NextRequest } from 'next/server';

import { LOCALE_HEADER, SITE_URL } from './app/locale';
import { DEFAULT_LOCALE, normalizeLocale } from './i18nConfig';

// Only the production domain should be indexable. Everything else
// (workers.dev, version preview URLs, preview-branch deployments, local dev)
// gets tagged noindex, mirroring the behaviour Vercel provided automatically.
const PRODUCTION_HOST = new URL(SITE_URL).host;

// Legacy host from the Vercel era; bound to this Worker via `custom_domain`
// in wrangler.jsonc so the redirect can live in-repo rather than dashboard-only.
const LEGACY_HOST = 'accent-marker.sessatakuma.dev';

// Kept as `middleware.ts` (Edge runtime) rather than Next 16's `proxy.ts`:
// the @opennextjs/cloudflare adapter requires Edge middleware, and Next 16's
// proxy runtime is Node.js-only and cannot be configured to Edge.
export function middleware(request: NextRequest) {
    // Applied to every response (redirect, SSR page, API proxy) so MIME-sniffing
    // protection matches the posture Vercel provided by default. Cloudflare's
    // `public/_headers` file only decorates static-asset responses served by the
    // asset handler, not Worker-generated SSR/redirect responses, so the header
    // must also be set here in the Edge middleware.
    const NO_SNIFF = 'nosniff';

    // 301 first so crawlers see the canonical URL without intermediate headers.
    if (request.headers.get('host') === LEGACY_HOST) {
        const targetUrl = new URL(request.url);
        targetUrl.protocol = 'https:';
        targetUrl.host = PRODUCTION_HOST;
        const redirect = NextResponse.redirect(targetUrl, 301);
        redirect.headers.set('X-Content-Type-Options', NO_SNIFF);
        return redirect;
    }

    const requestHeaders = new Headers(request.headers);
    const locale = normalizeLocale(request.nextUrl.searchParams.get('lang')) ?? DEFAULT_LOCALE;

    requestHeaders.set(LOCALE_HEADER, locale);

    const response = NextResponse.next({
        request: {
            headers: requestHeaders,
        },
    });

    response.headers.set('X-Content-Type-Options', NO_SNIFF);

    if (request.headers.get('host') !== PRODUCTION_HOST) {
        response.headers.set('X-Robots-Tag', 'noindex, nofollow');
    }

    return response;
}

export const config = {
    matcher: ['/((?!_next|favicon.ico).*)'],
};
