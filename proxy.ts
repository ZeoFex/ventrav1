import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

// Hardcoded for zero-dependency middleware (Edge-compatible)
// Matches server/config/auth-config.ts: COOKIE_NAMES.ACCESS
const ACCESS_TOKEN_COOKIE = "__ventra_at";

const DEV_ORIGIN_RE =
  /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|172\.\d+\.\d+\.\d+|admin\.localhost)(:\d+)?$/i;

function parseAdminOrigins(): string[] {
  return (process.env.ADMIN_DASHBOARD_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function matchCorsOrigin(request: NextRequest): string | null {
  const o = request.headers.get("origin");
  if (!o) {
    return null;
  }
  const list = parseAdminOrigins();
  if (list.includes(o)) {
    return o;
  }
  if (process.env.NODE_ENV === "development" && DEV_ORIGIN_RE.test(o)) {
    return o;
  }
  return null;
}

function applyApiCors(request: NextRequest) {
  const allow = matchCorsOrigin(request);
  if (request.method === "OPTIONS") {
    if (!request.headers.get("origin") || !allow) {
      return new NextResponse(null, { status: 204 });
    }
    return new NextResponse(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": allow,
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
        "Access-Control-Allow-Headers":
          "Authorization, Content-Type, X-Branch-Id, X-Requested-With, Cookie",
        "Access-Control-Max-Age": "86400",
        Vary: "Origin",
      },
    });
  }
  if (!allow) {
    return NextResponse.next();
  }
  const res = NextResponse.next();
  res.headers.set("Access-Control-Allow-Origin", allow);
  res.headers.set("Access-Control-Allow-Credentials", "true");
  res.headers.set("Vary", "Origin");
  return res;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api")) {
    return applyApiCors(request);
  }

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
        "/((?!_next/static|_next/image|favicon\\.ico|sw\\.js|workbox-|manifest\\.webmanifest|public|.*\\.png|.*\\.jpg).*)",
    ],
};
