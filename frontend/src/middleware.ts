import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const userCookie = request.cookies.get('user');
    const { pathname } = request.nextUrl;

    // Protect /dashboard routes
    if (pathname.startsWith('/dashboard')) {
        if (userCookie) {
            try {
                const user = JSON.parse(userCookie.value);
                // If user is a STUDENT, unauthorized for /dashboard -> send to /student
                if (user.role === 'STUDENT') {
                    return NextResponse.redirect(new URL('/student', request.url));
                }
            } catch (e) {
                // Invalid cookie data
                console.error('Middleware cookie parse error', e);
            }
        }
    }
}

export const config = {
    matcher: ['/dashboard/:path*'],
};
