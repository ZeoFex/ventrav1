/**
 * Gemini model + tunables for Zuri in-dashboard assistant (`app/lib/copilot`).
 * Uses GOOGLE_GENERATIVE_AI_API_KEY (see @ai-sdk/google).
 */
export const COPILOT_DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

export function getCopilotGeminiModelId(): string {
  return (
    process.env.COPILOT_GEMINI_MODEL?.trim() || COPILOT_DEFAULT_GEMINI_MODEL
  );
}

export function getCopilotMaxSteps(): number {
  const n = Number(process.env.COPILOT_MAX_STEPS);
  if (Number.isFinite(n) && n >= 1 && n <= 32) return Math.floor(n);
  return 12;
}

export function assertGoogleApiKeyConfigured(): void {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim()) {
    throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not configured");
  }
}
