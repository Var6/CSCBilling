import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const token = req.cookies.get('token')?.value;
  const { pathname } = req.nextUrl;

  // Protect dashboard routes
  if (pathname.startsWith('/Dashboard')) {
    if (!token) {
      return NextResponse.redirect(
        new URL('/Auth/login', req.url)
      );
    }
  }

  // Prevent logged-in users from visiting auth pages or root
  if (token && (pathname === '/' || pathname === '/Auth' || pathname.startsWith('/Auth'))) {
    return NextResponse.redirect(
      new URL('/Dashboard', req.url)
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/Auth/:path*', '/Dashboard/:path*'],
};
