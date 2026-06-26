import { env } from "../config/env";

/** Default sender once ventrapos.com is verified in Resend. */
const RESEND_DEFAULT_FROM = "VentraPOS <noreply@ventrapos.com>";

/**
 * Resend "from" address. Set RESEND_FROM_EMAIL in the environment
 * (must be a verified domain/sender in your Resend account).
 */
export function getResendFromEmail(displayName = "VentraPOS"): string {
    const configured = env.RESEND_FROM_EMAIL?.trim();
    if (configured) {
        if (configured.includes("<")) return configured;
        return `${displayName} <${configured}>`;
    }
    if (displayName === "VentraPOS") {
        return RESEND_DEFAULT_FROM;
    }
    return `${displayName} <noreply@ventrapos.com>`;
}
