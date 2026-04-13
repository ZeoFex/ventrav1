import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

// Hardcoded for zero-dependency middleware (Edge-compatible)
// Matches server/config/auth-config.ts: COOKIE_NAMES.ACCESS
const ACCESS_TOKEN_COOKIE = "__ventra_at";

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;

    // 1. If hitting auth pages while logged in -> Redirect to Dashboard
    const isAuthPage = pathname.startsWith("/login") ||
        pathname.startsWith("/signup") ||
        pathname.startsWith("/forgot-password") ||
        pathname.startsWith("/reset-password");

    if (isAuthPage && token) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    // 2. If hitting protected dashboard pages while NOT logged in -> Redirect to Login
    const isProtectedPage = pathname.startsWith("/dashboard") ||
        pathname.startsWith("/onboarding");

    if (isProtectedPage && !token) {
        const loginUrl = new URL("/login", request.url);
        // Optionally preserve the attempted URL to redirect back after login
        // loginUrl.searchParams.set("from", pathname);
        return NextResponse.redirect(loginUrl);
    }

    // 3. Role-based Protection for Dashboard Areas
    if (token && pathname.startsWith("/dashboard") && !pathname.startsWith("/dashboard/unauthorized")) {
        try {
            const secret = new TextEncoder().encode(process.env.JWT_SECRET || "default_too_short_secret_to_cause_error_if_missing");
            const { payload } = await jwtVerify(token, secret, {
                issuer: "ventrapos",
            });

            const role = payload.role as string;
            
            // Restricted paths for non-owners
            const isRestrictedPath = 
                pathname.startsWith("/dashboard/settings") ||
                pathname.startsWith("/dashboard/staff") ||
                pathname.startsWith("/dashboard/branches");

            if (role !== "owner" && isRestrictedPath) {
                return NextResponse.redirect(new URL("/dashboard/unauthorized", request.url));
            }
        } catch (err) {
            // If token is invalid or expired, we let the normal flow handle it or clear it
            // console.error("Middleware JWT verification failed:", err);
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public (public files)
         */
        "/((?!api|_next/static|_next/image|favicon.ico|sw\\.js|workbox-|manifest\\.webmanifest|public|.*\\.png|.*\\.jpg).*)",
    ],
};
