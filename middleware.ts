import { NextResponse, type NextRequest } from 'next/server';

import { LOCALE_HEADER } from './src/app/locale';
import { DEFAULT_LOCALE, normalizeLocale } from './src/i18nConfig';

export function middleware(request: NextRequest) {
    const requestHeaders = new Headers(request.headers);
    const locale =
        normalizeLocale(request.nextUrl.searchParams.get('lang')) ?? DEFAULT_LOCALE;

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
