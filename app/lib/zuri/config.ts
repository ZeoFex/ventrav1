import { getCopilotGroqModelId } from "@/app/lib/copilot/config";

/** Groq model for Zuri help chat. Uses GROQ_MODEL, same as in-dashboard Zuri. */
export function getZuriGroqModelId(): string {
    return getCopilotGroqModelId();
}
