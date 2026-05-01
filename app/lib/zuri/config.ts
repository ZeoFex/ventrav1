import { COPILOT_DEFAULT_GEMINI_MODEL } from "@/app/lib/copilot/config";

/** Gemini model for Zuri (Help chat; default model matches in-dashboard Zuri). */
export function getZuriGeminiModelId(): string {
    return process.env.ZURI_GEMINI_MODEL?.trim() || COPILOT_DEFAULT_GEMINI_MODEL;
}
