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
- **Global platform routes** (under `GET /api/platform/*` except act-as is never used here): send header **`X-Ventra-Platform-Key: <one of the configured keys>`** only. No user JWT. Common query parameters: **`limit`** (default 200, max 500), **`offset`**, and optional **`businessId`** to filter rows to one tenant (where the table is tenant-scoped; ignored on `.../stats`, `.../permissions`, `.../pending-subscriptions`).
- **Summary counts:** `GET /api/platform/stats` — returns `{ filter, counts }` for all major tables (useful for dashboard tiles). Same auth as other platform routes.
- **Billing (superadmin):** `GET /api/platform/billing/summary` — aggregates: plans, subscription status, business account status, referral-qualification counts, and `pending_subscriptions` by status (pre-signup Paystack rows are global, not per `businessId`). `GET /api/platform/billing/businesses` — paginated per-tenant subscription and referral fields (`plan`, `subscriptionStatus`, `currentPeriodEnd`, referral bps, codes, `referredByBusinessId`). For raw handoff rows use `GET /api/platform/pending-subscriptions` and for qualified referral payouts `GET /api/platform/referral-qualifications` (all platform-key only).
- **Platform writes (superadmin):** Same **`X-Ventra-Platform-Key`** (**no act-as on these routes**), or an **active superadmin** `Authorization: Bearer` JWT on routes that implement `requirePlatformAccess` (see `server/auth/api-request-auth.ts`). `GET /api/platform/overview` returns table counts + billing snapshot in one response. `POST /api/platform/users` creates a user in a business. `GET|PATCH|DELETE /api/platform/users/[id]` — GET/DELETE need `?businessId=`; PATCH is either `{ businessId, status }` (suspend, etc.) or a full staff update (like `POST /api/staff`). **`GET|PATCH|DELETE /api/platform/businesses/[id]`** — **GET** full row; **PATCH** tenant admin fields (**plan**, account **status**, `subscriptionStatus`, **`currentPeriodEnd`** (absolute) or **`extendSubscriptionDays`** (add days from renewal anchor—not both), **name**, etc.—at least one field per request); **`extendSubscriptionDays`** defaults **`subscriptionStatus`** to **`active`** when omitted; **DELETE** permanently removes the tenant (DB CASCADE); send JSON **`{ "confirmSlug": "<exact business slug>" }`** matching the row. For catalog/POS data mutations not yet exposed under `/api/platform/*`, use **`X-Act-As-Business-Id`** on the existing tenant APIs or add dedicated platform services later.
- **Paginated list mirrors** (all return `{ total, items, limit, offset }`): `businesses`, `users`, `branches`, `categories`, `tags`, `products`, `product-variations`, `product-tags`, `customers`, `sales`, `sale-items`, `expenses`, `discounts`, `notifications`, `reports`, `roles`, `permissions`, `role-permissions`, `user-roles`, `audit-logs`, `pending-subscriptions`, `referral-qualifications`, `email-verifications` (no secrets), `password-resets` (no tokens). Joined lists include **`businessId`** for filtering in your UI. User rows never include password material.
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
