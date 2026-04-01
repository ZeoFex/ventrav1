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
