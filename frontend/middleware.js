// frontend/middleware.js
import { NextResponse } from 'next/server';

const LOCALES = ['es', 'en', 'fr', 'pt', 'ru'];
const PUBLIC_FILE = /\.(?:.*)$/;

export function middleware(req) {
  const { pathname } = req.nextUrl;

  // Skip next internals, API routes and public files
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    PUBLIC_FILE.test(pathname)
  ) {
    return;
  }

  // If URL starts with a locale, rewrite to the same path without the prefix.
  // The URL stays locale-prefixed, but we serve the unprefixed route.
  const seg = pathname.split('/')[1];
  if (LOCALES.includes(seg)) {
    const stripped = pathname.replace(`/${seg}`, '') || '/';
    const url = req.nextUrl.clone();
    url.pathname = stripped;
    const res = NextResponse.rewrite(url);
    // Persist the chosen locale for SSR (optional but nice)
    res.cookies.set('NEXT_LOCALE', seg, { path: '/' });
    return res;
  }

  // No locale prefix ⇒ let it through
  return;
}

// Limit the middleware to everything (except static) – default matcher is fine.
// export const config = { matcher: ['/((?!_next|api|.*\\..*).*)'] };
