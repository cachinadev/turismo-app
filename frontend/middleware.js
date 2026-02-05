// frontend/middleware.js
import { NextResponse } from 'next/server';

/* ------------------------------------------------------
 * 🌐 Supported Locales
 * ------------------------------------------------------ */
const SUPPORTED_LOCALES = ['en', 'es', 'fr', 'pt', 'ru']; // English is default
const DEFAULT_LOCALE = 'en';

/* ------------------------------------------------------
 * 🚦 Middleware entry point
 * ------------------------------------------------------ */
export function middleware(req) {
  const { pathname, searchParams } = req.nextUrl;

   // 1) Excluir /admin completamente
  if (pathname.startsWith('/admin')) {
    return NextResponse.next();
  }

  // ✅ Skip static files, API routes, and Next internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/robots') ||
    pathname.startsWith('/sitemap') ||
    /\.(.*)$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  const segments = pathname.split('/').filter(Boolean);
  const firstSegment = segments[0];
  const secondSegment = segments[1];

  // 1b) If localized admin path like /en/admin/... -> redirect to /admin/...
  if (SUPPORTED_LOCALES.includes(firstSegment) && secondSegment === 'admin') {
    const redirectUrl = req.nextUrl.clone();
    const rest = segments.slice(2).join('/');
    redirectUrl.pathname = rest ? `/admin/${rest}` : '/admin';
    return NextResponse.redirect(redirectUrl);
  }

  /* ------------------------------------------------------
   * Case 1️⃣: Already localized (starts with /en, /es, /fr, etc.)
   * ------------------------------------------------------ */
  if (SUPPORTED_LOCALES.includes(firstSegment)) {
    // Store locale in cookie for consistency (used by SSR & client)
    const response = NextResponse.next();
    response.cookies.set('NEXT_LOCALE', firstSegment, {
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      sameSite: 'lax',
    });
    return response;
  }

  /* ------------------------------------------------------
   * Case 2️⃣: No locale prefix → Redirect to default locale
   * ------------------------------------------------------ */
  const redirectUrl = req.nextUrl.clone();
  redirectUrl.pathname = `/${DEFAULT_LOCALE}${pathname}`;
  return NextResponse.redirect(redirectUrl);
}

/* ------------------------------------------------------
 * ⚙️ Matcher — only run on non-static pages
 * ------------------------------------------------------ */
export const config = {
  matcher: [
    '/((?!_next|api|favicon|robots|sitemap|.*\\..*).*)',
  ],
};
