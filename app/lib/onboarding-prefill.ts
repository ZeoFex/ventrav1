/** Session key: signup → onboarding handoff (cleared after read). */
export const ONBOARDING_PREFILL_KEY = "ventrapos.onboarding.prefill";

export type OnboardingPrefillPayload = {
  businessId?: string;
  userId?: string;
  email?: string;
  storeName?: string;
  legalName?: string;
  plan?: string;
  cycle?: string;
  paid?: boolean;
};

export function writeOnboardingPrefill(payload: OnboardingPrefillPayload): void {
  try {
    sessionStorage.setItem(ONBOARDING_PREFILL_KEY, JSON.stringify(payload));
  } catch {
    /* private mode / quota */
  }
}

/**
 * Read and consume the prefill payload. Returns null if none is present.
 * Safe to call in non-browser contexts — returns null on the server.
 */
export function consumeOnboardingPrefill(): OnboardingPrefillPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(ONBOARDING_PREFILL_KEY);
    if (!raw) return null;
    window.sessionStorage.removeItem(ONBOARDING_PREFILL_KEY);
    return JSON.parse(raw) as OnboardingPrefillPayload;
  } catch {
    return null;
  }
}
