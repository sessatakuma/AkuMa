import { NextResponse, type NextRequest } from 'next/server';

import { LOCALE_HEADER, SITE_URL } from './app/locale';
import { DEFAULT_LOCALE, normalizeLocale } from './i18nConfig';

// Only the production domain should be indexable. Everything else
// (workers.dev, version preview URLs, preview-branch deployments, local dev)
// gets tagged noindex, mirroring the behaviour Vercel provided automatically.
const PRODUCTION_HOST = new URL(SITE_URL).host;

// Kept as `middleware.ts` (Edge runtime) rather than Next 16's `proxy.ts`:
// the @opennextjs/cloudflare adapter requires Edge middleware, and Next 16's
// proxy runtime is Node.js-only and cannot be configured to Edge.
export function middleware(request: NextRequest) {
    const requestHeaders = new Headers(request.headers);
    const locale = normalizeLocale(request.nextUrl.searchParams.get('lang')) ?? DEFAULT_LOCALE;

    requestHeaders.set(LOCALE_HEADER, locale);

    const response = NextResponse.next({
        request: {
            headers: requestHeaders,
        },
    });

    if (request.headers.get('host') !== PRODUCTION_HOST) {
        response.headers.set('X-Robots-Tag', 'noindex, nofollow');
    }

    return response;
}

export const config = {
    matcher: ['/((?!_next|favicon.ico).*)'],
};
