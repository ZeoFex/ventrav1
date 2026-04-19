"use client";

import { nanoid } from "nanoid";
import { useCallback, useState } from "react";
import type { CopilotPreferredLanguage } from "@/app/lib/copilot/prompts/system";
import type { ChatTurn, ToolRowState } from "../types";

type UiMessage = {
  id: string;
  role: "user" | "assistant";
  parts: Array<{ type: "text"; text: string }>;
};

function turnsToUiMessages(turns: ChatTurn[]): UiMessage[] {
  return turns.map((t) => ({
    id: nanoid(),
    role: t.role,
    parts: [{ type: "text", text: t.content }],
  }));
}

export function useCopilotChat(
  pathname: string,
  preferredLanguage: CopilotPreferredLanguage = "en",
) {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [pendingText, setPendingText] = useState("");
  const [pendingTools, setPendingTools] = useState<ToolRowState[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || streaming) return;

      setError(null);
      const nextTurns: ChatTurn[] = [
        ...turns,
        { role: "user", content: trimmed },
      ];
      setTurns(nextTurns);
      setPendingText("");
      setPendingTools([]);
      setStreaming(true);

      const uiMessages = turnsToUiMessages(nextTurns);

      let assistantText = "";
      const tools = new Map<string, ToolRowState>();

      try {
        const res = await fetch("/api/copilot/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: uiMessages,
            pathname,
            preferredLanguage,
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `Request failed (${res.status})`);
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No response body");

        const dec = new TextDecoder();
        let buf = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          let lineEnd: number;
          while ((lineEnd = buf.indexOf("\n")) >= 0) {
            const line = buf.slice(0, lineEnd).trim();
            buf = buf.slice(lineEnd + 1);
            if (!line) continue;
            let ev: Record<string, unknown>;
            try {
              ev = JSON.parse(line) as Record<string, unknown>;
            } catch {
              continue;
            }
            const t = ev.type;
            if (t === "text-delta" && typeof ev.delta === "string") {
              assistantText += ev.delta;
              setPendingText(assistantText);
            } else if (
              t === "tool-start" &&
              typeof ev.id === "string" &&
              typeof ev.name === "string"
            ) {
              tools.set(ev.id, {
                id: ev.id,
                name: ev.name,
                status: "running",
              });
              setPendingTools(Array.from(tools.values()));
            } else if (t === "tool-done" && typeof ev.id === "string") {
              const row = tools.get(ev.id) ?? {
                id: ev.id,
                name: "?",
                status: "running" as const,
              };
              tools.set(ev.id, {
                ...row,
                status: ev.ok === true ? "done" : "error",
                summary: typeof ev.summary === "string" ? ev.summary : undefined,
                errorText:
                  typeof ev.errorText === "string" ? ev.errorText : undefined,
              });
              setPendingTools(Array.from(tools.values()));
            } else if (t === "error" && typeof ev.message === "string") {
              setError(ev.message);
            }
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      } finally {
        setStreaming(false);
        setPendingTools([]);
        if (assistantText.trim()) {
          setTurns((t) => [
            ...t,
            { role: "assistant", content: assistantText.trim() },
          ]);
        }
        setPendingText("");
      }
    },
    [turns, streaming, pathname, preferredLanguage],
  );

  return {
    turns,
    pendingText,
    pendingTools,
    streaming,
    error,
    sendMessage,
    clear: () => {
      setTurns([]);
      setPendingText("");
      setPendingTools([]);
      setError(null);
    },
  };
}
