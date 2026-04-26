/**
 * Canonical public marketing / app site URL. Use for metadata, sitemaps, emails, and
 * share links when no NEXT_PUBLIC_APP_URL is set (e.g. production defaults to www.ventrapos.com).
 */
export const DEFAULT_PUBLIC_SITE_URL = "https://www.ventrapos.com" as const;

/**
 * Resolves the public site base URL without a trailing slash.
 * Prefer {@link process.env.NEXT_PUBLIC_APP_URL} when set (previews, explicit prod config).
 * In development, defaults to the local dev server. In production without env, uses {@link DEFAULT_PUBLIC_SITE_URL}.
 * On Vercel previews, `VERCEL_URL` is used when `NEXT_PUBLIC_APP_URL` is unset.
 */
export function getPublicBaseUrl(): string {
    const fromEnv = process.env.NEXT_PUBLIC_APP_URL;
    if (fromEnv != null && fromEnv.trim() !== "") {
        return fromEnv.replace(/\/$/, "").trim();
    }
    const vercel = process.env.VERCEL_URL?.trim();
    if (vercel) {
        return `https://${vercel.replace(/\/$/, "")}`;
    }
    if (process.env.NODE_ENV === "development") {
        return "http://localhost:3000";
    }
    return DEFAULT_PUBLIC_SITE_URL;
}
