import { env } from "../config/env";

/** Resend test sender — works without domain verification (dev only). */
const RESEND_DEV_FROM = "VentraPOS <onboarding@resend.dev>";

/** Production default once ventrapos.com is verified in Resend. */
const RESEND_PROD_FROM = "VentraPOS <noreply@ventrapos.com>";

/**
 * Resend "from" address. Override with RESEND_FROM_EMAIL in .env.local
 * (must be a verified domain/sender in your Resend account).
 *
 * In development, falls back to onboarding@resend.dev so signup works
 * before ventrapos.com DNS is verified.
 */
export function getResendFromEmail(displayName = "VentraPOS"): string {
    const configured = env.RESEND_FROM_EMAIL?.trim();
    if (configured) {
        if (configured.includes("<")) return configured;
        return `${displayName} <${configured}>`;
    }
    if (env.NODE_ENV === "development") {
        return displayName === "VentraPOS"
            ? RESEND_DEV_FROM
            : `${displayName} <onboarding@resend.dev>`;
    }
    return displayName === "VentraPOS"
        ? RESEND_PROD_FROM
        : `${displayName} <noreply@ventrapos.com>`;
}
