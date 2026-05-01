import { google } from "@ai-sdk/google";
import {
    convertToModelMessages,
    safeValidateUIMessages,
    streamText,
    type UIMessage,
} from "ai";
import { NextResponse } from "next/server";
import { assertGoogleApiKeyConfigured } from "@/app/lib/copilot/config";
import { buildZuriSystemPrompt } from "@/app/lib/zuri/prompt";
import { getZuriGeminiModelId } from "@/app/lib/zuri/config";
import {
    getKbSearchBundleFromUIMessages,
    getLastUserTextFromUIMessages,
} from "@/app/lib/zuri/extract-user-text";
import { isZuriRateLimited } from "@/app/lib/zuri/rate-limit";
import { requireUserAuth } from "@/server/auth/api-request-auth";
import { buildZuriKbContext } from "@/server/knowledge-base/zuri-context";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request): Promise<Response> {
    try {
        const auth = await requireUserAuth(req);
        if (auth instanceof NextResponse) return auth;

        if (await isZuriRateLimited(auth.payload.sub)) {
            return NextResponse.json(
                {
                    error:
                        "Zuri daily message limit reached. Try again tomorrow, or browse [Help Centre](/help).",
                },
                { status: 429, headers: { "Content-Type": "application/json" } },
            );
        }

        let body: unknown;
        try {
            body = await req.json();
        } catch {
            return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
        }

        const rec = body && typeof body === "object" ? (body as Record<string, unknown>) : null;
        const messagesUnknown = rec?.messages;

        const validated = await safeValidateUIMessages({
            messages: messagesUnknown === undefined ? [] : messagesUnknown,
        });
        if (!validated.success) {
            return NextResponse.json(
                { error: validated.error.message || "Invalid messages" },
                { status: 400 },
            );
        }

        const uiMessages = validated.data as UIMessage[];
        if (uiMessages.length === 0) {
            return NextResponse.json({ error: "messages required" }, { status: 400 });
        }

        const kbSearchText = getKbSearchBundleFromUIMessages(uiMessages) || getLastUserTextFromUIMessages(uiMessages);
        const { digest, retrievalEmpty } = buildZuriKbContext(kbSearchText, {
            maxArticles: 6,
            maxChars: 14_000,
        });

        const system = buildZuriSystemPrompt(digest, {
            retrievalEmpty,
            helpBasePath: "",
        });

        assertGoogleApiKeyConfigured();

        const modelMessages = await convertToModelMessages(uiMessages);

        const result = streamText({
            model: google(getZuriGeminiModelId()),
            system,
            messages: modelMessages,
            temperature: 0.12,
            maxOutputTokens: 2048,
        });

        return result.toUIMessageStreamResponse();
    } catch (e) {
        console.error("POST /api/support/zuri/chat", e);
        const message =
            e instanceof Error && e.message.includes("GOOGLE_GENERATIVE_AI_API_KEY")
                ? "Assistant is unavailable: AI key not configured."
                : "Assistant error. Try again or use Help Centre.";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
