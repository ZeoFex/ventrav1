# VentraPOS HTTP API: security and tenancy

## Transport

- Use **HTTPS** in production. Do not call the API over cleartext against real data.

## CORS and separate-origin clients

- Set `ADMIN_DASHBOARD_ORIGINS` in the environment to a **comma-separated list** of exact origins (e.g. `https://admin.ventrapos.com,https://preview.example.com`). The edge `proxy` adds `Access-Control-*` for `/api/*` when the request `Origin` matches. In `development`, common localhost and LAN-style origins are also allowed.
- For browser apps on another origin, you typically use **`Authorization: Bearer <access token>`** (see login). The access cookie is still set for same-origin and Electron; cross-site cookie auth is not assumed.

## Authentication

- **Login:** `POST /api/auth/login` with JSON credentials. The JSON body can include `accessToken` when `INCLUDE_ACCESS_TOKEN_IN_LOGIN` is not `false` (same JWT as the `__ventra_at` cookie). Treat the string like a **password** (memory-only in SPAs, never in URLs or logs).
- **Calls:** send `Authorization: Bearer <access_token>`, and/or the normal **HttpOnly** access cookie. Helpers resolve Bearer first, then the cookie.
- **Session (optional user):** `GET /api/auth/session` still returns JSON when the token is valid, or `{ user: null }` when not.

## Branch scope

- Send **`X-Branch-Id: <uuid>`** (or the existing branch selection cookie) to scope operations that are branch-specific. A value of `all` or an empty value means the global / all-branches view where the product allows it.

## Tenancy and roles

- Every business-scoped request uses the JWT `bid` and server-side services; do not trust a client-provided `businessId` for authorization.
- **Owner-only** and **role / permission** checks are enforced for sensitive areas (e.g. staff, business profile, branches, some billing and referral operations). The OpenAPI `summary` and tags list routes; for exact required roles, read the implementation or expand the spec over time.

## Webhooks and cron

- **Paystack:** `POST /api/webhooks/paystack` is verified with the **HMAC** header Paystack provides (not a user JWT).
- **Cron:** `GET /api/cron/subscriptions` expects `Authorization: Bearer <CRON_SECRET>` in production, or the dev server in development.

## Rate limits

- **Login:** per-IP using Redis (see `RATE_LIMIT_LOGIN_PER_IP` and `RATE_LIMIT_AUTH_EMAIL_WINDOW_SEC`).
- **Forgot password, resend OTP:** additional per-IP / per-key limits. On Redis errors, some limits are skipped so the app stays available (see server logs).

## API reference and OpenAPI

- Scalar UI: **`/api-reference`**.
- OpenAPI 3.1: **`/openapi.json`** (generated from the route tree: `node scripts/generate-openapi.mjs`).

## Payments

- Card collection follows your **Paystack** (or other) client-side integration; this API does not replace PCI obligations for any hosted fields you use.
