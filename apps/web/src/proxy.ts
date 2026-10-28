import { NextResponse, type NextRequest } from 'next/server';

const APP_ROUTES = ['/dashboard', '/applications', '/companies', '/interviews', '/cv-versions'];
const AUTH_ROUTES = ['/login', '/register'];

/**
 * Optimistic redirect only: it checks that a session cookie exists, not that it is valid.
 * The API verifies every request, and the client sends people to /login when it returns 401.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSession = request.cookies.has('jf_refresh') || request.cookies.has('jf_access');
  const matches = (routes: string[]) => routes.some((r) => pathname === r || pathname.startsWith(`${r}/`));

  if (matches(APP_ROUTES) && !hasSession) {
    const url = new URL('/login', request.url);
    url.searchParams.set('next', pathname + search);
    return NextResponse.redirect(url);
  }
  if (matches(AUTH_ROUTES) && hasSession) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/applications/:path*',
    '/companies/:path*',
    '/interviews/:path*',
    '/cv-versions/:path*',
    '/login',
    '/register',
  ],
};
