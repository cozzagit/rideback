import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  const isLoggedIn = !!token;

  const protectedPaths = ['/dashboard', '/company', '/drivers', '/vehicles', '/trips', '/my-bookings', '/earnings', '/profile', '/notifications', '/admin'];
  const isProtected = protectedPaths.some((path) => pathname.startsWith(path));

  if (isProtected && !isLoggedIn) {
    const loginUrl = new URL('/login', request.nextUrl.origin);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const authPaths = ['/login', '/register'];
  const isAuthPage = authPaths.some((path) => pathname.startsWith(path));

  if (isAuthPage && isLoggedIn) {
    return NextResponse.redirect(new URL('/dashboard', request.nextUrl.origin));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/company/:path*',
    '/drivers/:path*',
    '/vehicles/:path*',
    '/trips/:path*',
    '/my-bookings/:path*',
    '/earnings/:path*',
    '/profile/:path*',
    '/notifications/:path*',
    '/admin/:path*',
    '/login',
    '/register',
  ],
};
