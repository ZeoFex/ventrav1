/**
 * Groq model + tunables for Zuri (`app/lib/copilot` and support chat).
 * Set GROQ_API_KEY. Optional GROQ_MODEL overrides the default.
 * Llama 3.3 70B was removed from Groq developer keys on 2026-08-16.
 */
export const COPILOT_DEFAULT_GROQ_MODEL = "openai/gpt-oss-120b";

export function getCopilotGroqModelId(): string {
  return process.env.GROQ_MODEL?.trim() || COPILOT_DEFAULT_GROQ_MODEL;
}

export function getCopilotMaxSteps(): number {
  const n = Number(process.env.COPILOT_MAX_STEPS);
  if (Number.isFinite(n) && n >= 1 && n <= 32) return Math.floor(n);
  return 12;
}

export function assertGroqApiKeyConfigured(): void {
  if (!process.env.GROQ_API_KEY?.trim()) {
    throw new Error("GROQ_API_KEY is not configured");
  }
}
