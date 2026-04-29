/**
 * Superadmin platform API — reference for /superadmin-docs (not generated from code).
 * Update when adding /api/platform/* routes.
 */

export type PlatformEndpoint = {
    /** Short label, e.g. "List + stats" */
    label: string;
    /** "GET" for real HTTP lines; "—" / "header" / "param" for documentation-only rows */
    method: string;
    path: string;
    note?: string;
};

export type PlatformSection = {
    id: string;
    title: string;
    description: string;
    endpoints: PlatformEndpoint[];
};

/** One-tap path presets for the sandbox (GET + platform key only). */
export const sandboxPresets: { label: string; path: string }[] = [
    { label: "Overview", path: "/api/platform/overview" },
    { label: "Stats", path: "/api/platform/stats" },
    { label: "Billing summary", path: "/api/platform/billing/summary" },
    { label: "Businesses list", path: "/api/platform/businesses?limit=20" },
    { label: "Users list", path: "/api/platform/users?limit=20" },
];

export const platformSections: PlatformSection[] = [
    {
        id: "start",
        title: "Start here",
        description:
            "Read-heavy dashboards use GET list routes and /api/platform/overview. User suspension, user creation, and business plan/status updates use the Writes section (same X-Ventra-Platform-Key). For product or branch create/edit in a store, use the tenant API with act-as headers — see the Act-as section.",
        endpoints: [
            {
                label: "Recommended first call",
                method: "GET",
                path: "/api/platform/overview",
                note: "Single response: { generatedAt, filter, counts, billing }. Same filters as /stats and /billing/summary. Optional ?businessId= to scope where supported.",
            },
        ],
    },
    {
        id: "auth",
        title: "Authentication",
        description:
            "Dual auth on /api/platform/*: (1) Send your automation secret as X-Ventra-Platform-Key (not Bearer tenant JWT). (2) Or send Authorization: Bearer <token> using an access token from POST /api/superadmin/auth/login (human superadmins; requires SUPERADMIN_JWT_SECRET in env). Tokens use a distinct HS256 secret and audience from tenant dashboards. If X-Ventra-Platform-Key is non-empty and invalid, the request returns 401 (Bearer fallback is not used). Use HTTPS in production. Never put the platform key in frontend bundles; prefer Bearer for browser SPAs. To provision a new human superadmin, only POST /api/superadmin/accounts with the platform key (no public signup).",
        endpoints: [
            {
                label: "Header (automation / scripts)",
                method: "header",
                path: "X-Ventra-Platform-Key: <one key from VENTRA_PLATFORM_API_KEYS>",
                note: "Each key is ≥ 32 characters. Comma-separate multiple keys in env. Empty env disables platform key auth (401 when no valid Bearer).",
            },
            {
                label: "Bearer (human superadmin, alternative to platform key)",
                method: "header",
                path: "Authorization: Bearer <access token from /api/superadmin/auth/login>",
                note: "Same access to /api/platform/* list and write routes as a valid platform key. Not the same token as tenant /api/auth/login.",
            },
            {
                label: "Superadmin login",
                method: "POST",
                path: "/api/superadmin/auth/login",
                note: 'Body: { "email", "password" }. Returns { accessToken, user } or 503 if SUPERADMIN_JWT_SECRET is unset.',
            },
            {
                label: "Superadmin session (Bearer only)",
                method: "GET",
                path: "/api/superadmin/auth/session",
                note: "Uses Authorization only; does not read the tenant __ventra_at cookie.",
            },
            {
                label: "Create superadmin (platform key only)",
                method: "POST",
                path: "/api/superadmin/accounts",
                note: 'Body: { email, password (≥12 chars), firstName, lastName? }. 409 if email exists on tenant or superadmin.',
            },
            {
                label: "Superadmin logout (stateless)",
                method: "POST",
                path: "/api/superadmin/auth/logout",
                note: "No server session; discard the access token on the client.",
            },
        ],
    },
    {
        id: "query",
        title: "Query parameters (lists & aggregates)",
        description:
            "List endpoints return { total, items, limit, offset }. Aggregates: /api/platform/stats, /api/platform/billing/summary, and /api/platform/overview support optional ?businessId= to narrow counts (pending Paystack handoffs in billing always stay global).",
        endpoints: [
            {
                label: "limit",
                method: "param",
                path: "?limit=200",
                note: "Default 200, max 500 (platform lists).",
            },
            {
                label: "offset",
                method: "param",
                path: "?offset=0",
                note: "Pagination offset.",
            },
            {
                label: "Filter one tenant (optional)",
                method: "param",
                path: "?businessId=<uuid>",
                note: "Narrow list rows, or /stats, /overview, and billing (except pending-subscription totals). Ignored on /permissions, /pending-subscriptions list.",
            },
        ],
    },
    {
        id: "cors",
        title: "CORS (browser)",
        description:
            "Set ADMIN_DASHBOARD_ORIGINS and/or SUPERADMIN_DASHBOARD_ORIGINS to your superadmin app origin. The proxy allowlists those origins for /api/* and exposes X-Ventra-Platform-Key and X-Act-As-Business-Id in preflight.",
        endpoints: [],
    },
    {
        id: "aggregate",
        title: "Dashboard & aggregates",
        description: "Read-only. Pick overview for a single request, or the dedicated endpoints for smaller payloads.",
        endpoints: [
            { label: "Table counts + billing snapshot (single request)", method: "GET", path: "/api/platform/overview" },
            { label: "Cross-table row counts only", method: "GET", path: "/api/platform/stats" },
            { label: "Billing / subscription mix, pending handoffs, referrals", method: "GET", path: "/api/platform/billing/summary" },
        ],
    },
    {
        id: "mutations",
        title: "Writes (superadmin)",
        description:
            "Same X-Ventra-Platform-Key; no act-as. Deleting a user can fail on foreign keys. For catalog, POS, or branch create/update not listed here, use act-as (below) on the normal /api/… routes or add more platform services later.",
        endpoints: [
            {
                label: "Create user in a business",
                method: "POST",
                path: "/api/platform/users",
                note: 'Body JSON: { businessId, branchId, firstName, lastName?, email, phone, password, roleName, permissionKeys?[] } — same shape as owner POST /api/staff.',
            },
            {
                label: "Get one user (role + branch)",
                method: "GET",
                path: "/api/platform/users/{id}?businessId=<uuid>",
                note: "Replace {id} with the user’s UUID. businessId is required in the query string.",
            },
            {
                label: "Update user — suspend, or full staff row",
                method: "PATCH",
                path: "/api/platform/users/{id}",
                note: 'Status only: { "businessId", "status": "suspended" | "active" | "deactivated" | "pending_verification" } (exactly these two fields). Or full update with firstName, email, phone, roleName, branchId, businessId, optional password — same as PATCH /api/staff/[id].',
            },
            {
                label: "Delete user",
                method: "DELETE",
                path: "/api/platform/users/{id}?businessId=<uuid>",
                note: "Requires ?businessId=. Use with care.",
            },
            {
                label: "Get one business (full row)",
                method: "GET",
                path: "/api/platform/businesses/{id}",
            },
            {
                label: "Update business (plan, subscription, account status, period end, name)",
                method: "PATCH",
                path: "/api/platform/businesses/{id}",
                note: "Body: at least one of name, status (active|suspended|deactivated), plan (starter|growth|pro), subscriptionStatus (active|past_due|canceled), currentPeriodEnd (ISO datetime string or null).",
            },
        ],
    },
    {
        id: "tenants",
        title: "Businesses & billing (read lists)",
        description: "Paginated tables. For a single business record by id, use GET /api/platform/businesses/{id} under Writes, or the list with ?businessId=.",
        endpoints: [
            { label: "All businesses (summary columns)", method: "GET", path: "/api/platform/businesses" },
            { label: "Subscription + referral columns per business", method: "GET", path: "/api/platform/billing/businesses" },
        ],
    },
    {
        id: "billing",
        title: "Billing data (read, raw tables)",
        description: "Pre-signup Paystack handoffs and referral qualification events.",
        endpoints: [
            { label: "Pending subscriptions (global; no businessId in table)", method: "GET", path: "/api/platform/pending-subscriptions" },
            { label: "Referral qualifications", method: "GET", path: "/api/platform/referral-qualifications" },
        ],
    },
    {
        id: "users",
        title: "Users & access control (read lists)",
        description: "Staff list and RBAC data (no password hashes in responses). For create, suspend, or delete, use Writes.",
        endpoints: [
            { label: "All users (paginated)", method: "GET", path: "/api/platform/users" },
            { label: "Roles", method: "GET", path: "/api/platform/roles" },
            { label: "Global permission catalog", method: "GET", path: "/api/platform/permissions" },
            { label: "Role ↔ permission pairs", method: "GET", path: "/api/platform/role-permissions" },
            { label: "User ↔ role assignments", method: "GET", path: "/api/platform/user-roles" },
        ],
    },
    {
        id: "catalog",
        title: "Catalog (read lists)",
        description: "Products, categories, and tags (cross-tenant). Mutations: act-as on /api/products etc.",
        endpoints: [
            { label: "Categories", method: "GET", path: "/api/platform/categories" },
            { label: "Tags", method: "GET", path: "/api/platform/tags" },
            { label: "Products", method: "GET", path: "/api/platform/products" },
            { label: "Product variations", method: "GET", path: "/api/platform/product-variations" },
            { label: "Product ↔ tag links", method: "GET", path: "/api/platform/product-tags" },
        ],
    },
    {
        id: "operations",
        title: "Operations & sales (read lists)",
        description: "Branches, customers, POS, finance, notifications.",
        endpoints: [
            { label: "Branches", method: "GET", path: "/api/platform/branches" },
            { label: "Customers", method: "GET", path: "/api/platform/customers" },
            { label: "Sales", method: "GET", path: "/api/platform/sales" },
            { label: "Sale line items (includes businessId via join)", method: "GET", path: "/api/platform/sale-items" },
            { label: "Expenses", method: "GET", path: "/api/platform/expenses" },
            { label: "Discounts", method: "GET", path: "/api/platform/discounts" },
            { label: "In-app notifications", method: "GET", path: "/api/platform/notifications" },
            { label: "Scheduled reports (history rows)", method: "GET", path: "/api/platform/reports" },
        ],
    },
    {
        id: "compliance",
        title: "Audit & account recovery (read, sanitized)",
        description: "Sensitive secrets are never returned. Use for support triage only.",
        endpoints: [
            { label: "Audit log", method: "GET", path: "/api/platform/audit-logs" },
            { label: "Email verifications (no codes)", method: "GET", path: "/api/platform/email-verifications" },
            { label: "Password reset rows (no tokens)", method: "GET", path: "/api/platform/password-resets" },
        ],
    },
    {
        id: "tenant-routes",
        title: "Act-as (optional)",
        description:
            "Normal app APIs (e.g. /api/business, /api/branches, /api/products) are tenant-scoped. With automation, send X-Ventra-Platform-Key and X-Act-As-Business-Id: <uuid> — no end-user login. For cross-tenant list data, use /api/platform/… GET routes instead. See docs/API-SECURITY.md.",
        endpoints: [],
    },
    {
        id: "open",
        title: "OpenAPI (full machine spec)",
        description: "All HTTP routes in the app, not only platform. For interactive “Try it” on every path.",
        endpoints: [
            { label: "Scalar API reference", method: "GET", path: "/api-reference" },
            { label: "OpenAPI JSON", method: "GET", path: "/openapi.json" },
        ],
    },
];

export const defaultSandboxPath = "/api/platform/overview";
