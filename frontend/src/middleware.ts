import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    // Get the path/url
    const path = request.nextUrl.pathname;

    // Define public paths that don't require authentication
    const isPublicPath = path === '/login' || path === '/landing' || path === '/landing2' || path === '/privacy-policy' || path === '/terms-of-service' || path.startsWith('/intake');

    // Check for the auth cookie
    // Note: In a real app, you'd verify the token signature/validity
    const token = request.cookies.get('auth_token')?.value;

    // 1. If user is on a public path (login) and has a token, redirect to dashboard
    if (isPublicPath && token) {
        return NextResponse.redirect(new URL('/', request.nextUrl));
    }

    // 2. If user is not on a public path and has NO token, redirect to login
    if (!isPublicPath && !token) {
        return NextResponse.redirect(new URL('/login', request.nextUrl));
    }

    // Reference for matching logic to avoid loops or blocking static assets:
    // We'll filter in the config matcher below.
}

// See "Matching Paths" below to learn more
export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * And exclude common static file extensions served from public/
         * (Next.js serves public/ files at the root, e.g. /logo.png not /public/logo.png)
         */
        '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webp|gif|css|js|woff2?|ttf|eot)$).*)',
    ],
};
