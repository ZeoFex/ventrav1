import type { UIMessage } from "ai";

/** Latest non-empty text from the most recent user message (for KB retrieval). */
export function getLastUserTextFromUIMessages(messages: UIMessage[]): string {
    for (let i = messages.length - 1; i >= 0; i--) {
        const m = messages[i]!;
        if (m.role !== "user") continue;
        const texts = m.parts
            .filter((p): p is { type: "text"; text: string } => p.type === "text")
            .map((p) => p.text);
        const joined = texts.join("\n").trim();
        if (joined) return joined;
    }
    return "";
}

const KB_SEARCH_SEP = "\n";

/** Last several user turns, for KB search across follow-up troubleshooting context. */
export function getKbSearchBundleFromUIMessages(messages: UIMessage[], maxUserTurns = 4, maxChars = 2500): string {
    const userTexts: string[] = [];
    for (let i = messages.length - 1; i >= 0 && userTexts.length < maxUserTurns; i--) {
        const m = messages[i]!;
        if (m.role !== "user") continue;
        const texts = m.parts
            .filter((p): p is { type: "text"; text: string } => p.type === "text")
            .map((p) => p.text);
        const joined = texts.join("\n").trim();
        if (joined) userTexts.push(joined);
    }
    userTexts.reverse();
    const bundled = userTexts.join(KB_SEARCH_SEP).slice(0, maxChars);
    return bundled.trim();
}
