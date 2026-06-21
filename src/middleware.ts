import { NextResponse, type NextRequest } from 'next/server';

import { LOCALE_HEADER } from './app/locale';
import { DEFAULT_LOCALE, normalizeLocale } from './i18nConfig';

// Kept as `middleware.ts` (Edge runtime) rather than Next 16's `proxy.ts`:
// the @opennextjs/cloudflare adapter requires Edge middleware, and Next 16's
// proxy runtime is Node.js-only and cannot be configured to Edge.
export function middleware(request: NextRequest) {
    const requestHeaders = new Headers(request.headers);
    const locale = normalizeLocale(request.nextUrl.searchParams.get('lang')) ?? DEFAULT_LOCALE;

    requestHeaders.set(LOCALE_HEADER, locale);

    return NextResponse.next({
        request: {
            headers: requestHeaders,
        },
    });
}

export const config = {
    matcher: ['/((?!_next|favicon.ico).*)'],
};
