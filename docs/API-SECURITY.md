# VentraPOS HTTP API: security and tenancy

## Transport

- Use **HTTPS** in production. Do not call the API over cleartext against real data.

## CORS and separate-origin clients

- Set `ADMIN_DASHBOARD_ORIGINS` in the environment to a **comma-separated list** of exact origins (e.g. `https://admin.ventrapos.com,https://preview.example.com`). The edge `proxy` adds `Access-Control-*` for `/api/*` when the request `Origin` matches. In `development`, common localhost and LAN-style origins are also allowed.
- For a **superadmin** dashboard on another origin, add those origins to `SUPERADMIN_DASHBOARD_ORIGINS` (merged with `ADMIN_DASHBOARD_ORIGINS` for the same CORS allowlist), or list everything once under `ADMIN_DASHBOARD_ORIGINS` if you prefer a single variable.
- For browser apps on another origin, you typically use **`Authorization: Bearer <access token>`** (see login). The access cookie is still set for same-origin and Electron; cross-site cookie auth is not assumed.

## Authentication

- **Login:** `POST /api/auth/login` with JSON credentials. The JSON body can include `accessToken` when `INCLUDE_ACCESS_TOKEN_IN_LOGIN` is not `false` (same JWT as the `__ventra_at` cookie). Treat the string like a **password** (memory-only in SPAs, never in URLs or logs).
- **Calls:** send `Authorization: Bearer <access_token>`, and/or the normal **HttpOnly** access cookie. Helpers resolve Bearer first, then the cookie.
- **Session (optional user):** `GET /api/auth/session` still returns JSON when the token is valid, or `{ user: null }` when not.

## Branch scope

- Send **`X-Branch-Id: <uuid>`** (or the existing branch selection cookie) to scope operations that are branch-specific. A value of `all` or an empty value means the global / all-branches view where the product allows it.

## Platform (superadmin) API keys

- Set `VENTRA_PLATFORM_API_KEYS` to a **comma-separated** list of high-entropy secrets (each at least 32 characters). If unset or empty, platform authentication is **disabled** (all platform-key requests get 401).
- **Global platform routes** (e.g. `GET /api/platform/businesses`): send header **`X-Ventra-Platform-Key: <one of the configured keys>`** only. No user JWT. Supports `limit` and `offset` query parameters.
- **Tenant-scoped routes** (same as normal API, e.g. products, staff): send **`X-Ventra-Platform-Key`** and **`X-Act-As-Business-Id: <business uuid>`**. The server resolves a real user in that business (first created user) and builds an internal “owner” context so existing handlers keep working. Do not expose these keys in client-side bundles; treat them like root credentials; rotate by updating env and redeploying.
- Optional CORS: use `SUPERADMIN_DASHBOARD_ORIGINS` and/or `ADMIN_DASHBOARD_ORIGINS` as above. Custom headers are allowed: `X-Ventra-Platform-Key`, `X-Act-As-Business-Id` (in addition to `Authorization`, `X-Branch-Id`, etc.).

## Tenancy and roles

- Every business-scoped request uses the JWT `bid` (or platform act-as) and server-side services; do not trust a client-provided `businessId` for authorization unless it is the act-as header used **with** a valid platform key.
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
