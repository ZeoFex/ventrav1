import { google } from "@ai-sdk/google";
import {
  convertToModelMessages,
  safeValidateUIMessages,
  streamText,
  stepCountIs,
} from "ai";
import {
  assertGoogleApiKeyConfigured,
  getCopilotGeminiModelId,
  getCopilotMaxSteps,
} from "../config";
import { logCopilotAudit } from "../audit";
import type { CopilotScope } from "../scope";
import {
  buildCopilotSystemPrompt,
  type CopilotPreferredLanguage,
} from "../prompts/system";
import type { CopilotStreamEvent } from "../stream/events";
import { buildCopilotToolSet } from "../tools/registry";

export async function orchestrateCopilotChat(options: {
  scope: CopilotScope;
  messages: unknown;
  preferredLanguage?: CopilotPreferredLanguage;
  onEvent: (e: CopilotStreamEvent) => void;
}): Promise<void> {
  assertGoogleApiKeyConfigured();
  const validated = await safeValidateUIMessages({
    messages: options.messages,
  });
  if (!validated.success) {
    throw validated.error;
  }

  const tools = buildCopilotToolSet(options.scope);
  const modelMessages = await convertToModelMessages(validated.data, {
    tools,
  });
  const model = google(getCopilotGeminiModelId());

  const result = streamText({
    model,
    system: buildCopilotSystemPrompt(options.scope, {
      preferredLanguage: options.preferredLanguage ?? "en",
    }),
    messages: modelMessages,
    tools,
    stopWhen: stepCountIs(getCopilotMaxSteps()),
    experimental_onToolCallFinish: async (event) => {
      const name = event.toolCall.toolName;
      await logCopilotAudit(options.scope, {
        kind: "tool",
        toolName: name,
        ok: event.success,
        summary: event.success
          ? truncate(JSON.stringify(event.output), 400)
          : truncate(String(event.error), 400),
      });
    },
  });

  let sawFinish = false;
  for await (const part of result.fullStream) {
    switch (part.type) {
      case "text-delta":
        options.onEvent({ type: "text-delta", delta: part.text });
        break;
      case "tool-call":
        options.onEvent({
          type: "tool-start",
          id: part.toolCallId,
          name: part.toolName,
        });
        break;
      case "tool-result": {
        const summary = summarizeToolOutput(part.output);
        options.onEvent({
          type: "tool-done",
          id: part.toolCallId,
          ok: true,
          summary,
        });
        break;
      }
      case "tool-error":
        options.onEvent({
          type: "tool-done",
          id: part.toolCallId,
          ok: false,
          errorText: truncate(String(part.error), 400),
        });
        break;
      case "error":
        options.onEvent({
          type: "error",
          message: String(part.error),
        });
        break;
      case "finish": {
        sawFinish = true;
        options.onEvent({
          type: "done",
          finishReason: part.finishReason,
          usage: part.totalUsage,
        });
        break;
      }
      default:
        break;
    }
  }

  if (!sawFinish) {
    try {
      const usage = await result.totalUsage;
      options.onEvent({ type: "done", usage });
    } catch {
      options.onEvent({ type: "done" });
    }
  }
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return `${s.slice(0, n)}…`;
}

function summarizeToolOutput(output: unknown): string {
  try {
    return truncate(JSON.stringify(output), 600);
  } catch {
    return truncate(String(output), 600);
  }
}
