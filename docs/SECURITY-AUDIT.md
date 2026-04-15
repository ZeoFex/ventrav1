# Security & architecture report — VentraPOS codebase

**Generated:** Internal audit snapshot. Re-run and update after major changes.

**Methodology:** Repository discovery, mapping of API routes and critical flows, and deep review of auth, payments, POS, webhooks, Redis, and cron. Full line-by-line review of every source file was not performed; use SAST tools and a second pass for complete coverage.

---

## 1. System overview

### Architecture (summary)

- **Application:** Next.js 16 (App Router) monolith: React UI + `app/api/**` Route Handlers as the HTTP API.
- **Backend logic:** `server/` — auth (`server/auth/*`), domain services (`server/pos`, `server/products`, `server/finance`, etc.), Drizzle ORM + PostgreSQL (`server/db/`).
- **Caching / queues:** Redis via `ioredis` (`server/lib/redis.ts`); Upstash Redis for POS relay (`lib/pos-relay-store.ts`); BullMQ in dependencies.
- **Auth:** JWT (HS256, `jose`) in HttpOnly cookie; session TTL per `server/config/auth-config.ts`.
- **Payments:** Paystack (charge, webhooks, status polling).
- **Files:** Uploadthing for uploads.

### Tech stack

- **DB:** PostgreSQL, `postgres` driver, Drizzle (`drizzle-kit` migrations).
- **Passwords:** Argon2id (`@node-rs/argon2`).
- **Validation:** Zod in many routes.

### Key modules

| Area        | Location                                      |
| ----------- | --------------------------------------------- |
| HTTP API    | `app/api/**/route.ts` (~54 route modules)     |
| Auth        | `app/api/auth/*`, `server/auth/*`             |
| POS / sales | `app/api/pos/*`, `server/pos/pos-service.ts`   |
| Products    | `app/api/products/*`, `server/products/*`      |
| Billing     | `app/api/billing/*`, `app/api/webhooks/paystack/route.ts` |
| Cron        | `app/api/cron/subscriptions/route.ts`         |

### Repository map (high level)

- `app/` — pages, layouts, components, `api/` (backend surface).
- `server/` — DB, auth, business logic.
- `components/ui/` — shared UI.
- `config/` — plans, feature access.
- `electron/` — desktop wrapper (separate from web API).
- `scripts/` — seed, simulations.

### Data flow (textual)

1. Browser → Next.js Route Handler → `verifyAccessToken` (cookie) or public endpoint.
2. Tenant scope: JWT `bid` (business id) + optional branch cookie (`getActiveBranchId`).
3. Mutations: Drizzle parameterized queries; some `sql` fragments use bound columns.
4. Payments: Client → `/api/billing/charge` → Paystack; Paystack → `/api/webhooks/paystack` (HMAC).
5. POS relay: `POST /api/pos/relay` creates session; phone posts to `/api/pos/relay/[sessionId]/scan` with token.

### Authentication flow (simplified)

- **Login:** `POST /api/auth/login` → `login()` → Argon2 verify → `signAccessToken` → HttpOnly `__ventra_at` cookie.
- **Requests:** API reads cookie → `verifyAccessToken` → `bid` / `sub` / `role` / `perms`.

---

## 2. Risk summary

| Level    | Focus                          |
| -------- | ------------------------------ |
| **High** | Secrets + financial integrity  |
| **Medium** | Relay abuse, rate limits, billing consistency |
| **Low**  | Hardening, observability       |

**Overall system risk level:** **Medium–High** until hardcoded Redis credentials are removed and checkout totals are validated server-side.

---

## 3. Critical vulnerabilities (HIGH)

### H1 — Hardcoded Redis URL with embedded credentials

- **File:** `server/lib/redis.ts`
- **Issue:** Fallback `redisUrl` may include a full `rediss://` URL with credentials in source. Anyone with repo access may obtain Redis access if still valid.
- **Impact:** Cache poisoning, data exposure, DoS, lateral impact depending on Redis usage.
- **Fix:** Remove default; require `REDIS_URL` in all environments; rotate credentials; audit access.

### H2 — POS checkout trusts client-supplied financial totals

- **Files:** `app/api/pos/checkout/route.ts`, `server/pos/pos-service.ts` (`completeCheckout`)
- **Issue:** `subtotalGhs`, `taxGhs`, `discountGhs`, `totalGhs`, line `unitPriceGhs` / `lineTotalGhs` come from client JSON. Server does not recompute sale amounts from DB prices before writing `sales` / `sale_items`.
- **Exploit:** Authenticated user submits correct product IDs but manipulated totals → incorrect revenue / tax / receipts stored.
- **Fix:** Load authoritative prices from `products` / `product_variations` for `businessId`; recompute line and order totals server-side; reject mismatches beyond rounding.

### H3 — Variation stock updates not scoped to tenant in WHERE clause

- **File:** `server/pos/pos-service.ts` (variation branch of stock update)
- **Issue:** Update uses `eq(productVariations.id, line.variationId)` only. Main product path uses `eq(products.businessId, businessId)`.
- **Exploit:** If another tenant’s `variationId` UUID is known, stock could be deducted across tenants (integrity / availability).
- **Fix:** Join `productVariations` → `products` and require `products.businessId = businessId` on every stock mutation.

---

## 4. Medium risks

- **M1 — Paystack webhook** (`app/api/webhooks/paystack/route.ts`): Updates `businesses.plan` only; may not align `subscriptionStatus`, `currentPeriodEnd` with other billing paths — inconsistent state.
- **M2 — Webhook reference parsing:** Plan inferred from reference + amount heuristics; must stay aligned with charge route reference format and Paystack currency units (pesewas).
- **M3 — Unauthenticated POS relay session creation** (`app/api/pos/relay/route.ts`): Abuse / DoS potential without rate limits.
- **M4 — Public barcode lookup** (`app/api/products/lookup/route.ts`): No auth; can abuse upstream API or quotas — rate limit per IP.
- **M5 — JWT `jti` not checked against revocation:** Stolen token valid until expiry — consider denylist or shorter TTL for sensitive operations.
- **M6 — Cron** (`app/api/cron/subscriptions/route.ts`): Development bypass of `CRON_SECRET` — ensure production always requires secret.
- **M7 — Branch cookie not HttpOnly:** XSS on main domain could change branch — mitigate with CSP and XSS defenses.

---

## 5. Low risks / improvements

- Rate limiting on login, signup, forgot-password, billing charge.
- Security headers (CSP, HSTS) review for production.
- Ensure high-value actions write to `audit-logs` where applicable.
- Regular `pnpm audit` and dependency updates.

**Positive findings**

- Passwords: Argon2id (`server/auth/password-service.ts`).
- Paystack webhook: HMAC verification when `PAYSTACK_SECRET_KEY` is set.
- Login: Zod validation.
- Drizzle: Parameterized queries; reviewed `sql` usage binds columns, not raw user strings.

---

## 6. Architecture weaknesses

- Monolith API + long-lived JWT: simple to operate; token revocation needs explicit design.
- Financial truth must not originate on the client for POS (see H2).
- Dual Redis stacks (ioredis vs Upstash): clarify ops and secrets.

---

## 7. Security score (0–100)

**Suggested: 58 / 100** (pre-remediation)

With H1–H3 fixed and rate limits added: **~75–82** (estimated).

---

## 8. Immediate fix checklist

1. Remove hardcoded Redis URL; require `REDIS_URL`; rotate Redis credentials.
2. Server-side pricing engine for `completeCheckout`; validate monetary fields against catalog.
3. Scope variation stock updates to `businessId` via join to `products`.
4. Align Paystack webhook with billing status / charge flow for subscription fields.
5. Rate limit `/api/pos/relay` (POST), `/api/products/lookup`, `/api/auth/login`.
6. Schedule dependency and secret rotation review.

---

## Follow-up

- Run SAST and grep for `dangerouslySetInnerHTML`, `eval`, `child_process`.
- Extend review to remaining API routes and Electron surface if applicable.
