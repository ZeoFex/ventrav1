"use client";

import { useState } from "react";
import { useCopilot } from "../copilot-context";
import { useCopilotChat } from "../hooks/use-copilot-chat";
import { CopilotMessageList } from "./copilot-message-list";
import { CopilotComposer } from "./copilot-composer";

export function CopilotChat() {
  const { pathname } = useCopilot();
  const { turns, pendingText, pendingTools, streaming, error, sendMessage, clear } =
    useCopilotChat(pathname);
  const [draft, setDraft] = useState("");

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-[#bfc9c3]/15 px-3 py-2 dark:border-white/[0.08]">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Chat
        </p>
        <button
          type="button"
          onClick={clear}
          className="text-[12px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          Clear
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {turns.length === 0 && !streaming ? (
          <div className="px-4 py-8 text-center">
            <p className="text-[15px] font-medium text-foreground">
              Ask anything about your store
            </p>
            <p className="mt-2 text-[13px] text-muted-foreground">
              Sales, stock, billing, or where to find a setting — powered by Gemini. Use the
              mic to speak your question (Chrome or Edge).
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {[
                "How did sales compare to yesterday?",
                "Which products are low on stock?",
                "Where do I manage discounts?",
              ].map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => {
                    setDraft(q);
                  }}
                  className="rounded-full border border-[#bfc9c3]/20 bg-surface-elevated px-3 py-1.5 text-[12px] text-foreground transition-colors hover:border-[#006c49]/40 dark:border-white/[0.1]"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        <CopilotMessageList
          turns={turns}
          pendingText={pendingText}
          pendingTools={pendingTools}
          streaming={streaming}
        />
        {error ? (
          <p className="px-4 pb-2 text-[13px] text-red-600 dark:text-red-400">{error}</p>
        ) : null}
      </div>
      <CopilotComposer
        value={draft}
        onChange={setDraft}
        disabled={streaming}
        onSubmit={() => {
          void sendMessage(draft);
          setDraft("");
        }}
        onVoiceSubmit={(text) => {
          void sendMessage(text);
          setDraft("");
        }}
      />
    </div>
  );
}
