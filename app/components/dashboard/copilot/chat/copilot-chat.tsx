"use client";

import { useState } from "react";
import type { CopilotPreferredLanguage } from "@/app/lib/copilot/prompts/system";
import { useCopilot } from "../copilot-context";
import { useCopilotChat } from "../hooks/use-copilot-chat";
import { CopilotMessageList } from "./copilot-message-list";
import { CopilotComposer } from "./copilot-composer";
import type { KhayaPlayTtsLanguage } from "./copilot-khaya-play";
import { cn } from "@/lib/utils";

const LANGUAGE_OPTIONS: { id: CopilotPreferredLanguage; label: string }[] = [
  { id: "en", label: "English" },
  { id: "tw", label: "Twi" },
  { id: "gaa", label: "Ga" },
  { id: "ee", label: "Ewe" },
];

export function CopilotChat() {
  const { pathname } = useCopilot();
  const [speechMode, setSpeechMode] = useState<CopilotPreferredLanguage>("en");
  const { turns, pendingText, pendingTools, streaming, error, sendMessage, clear } =
    useCopilotChat(pathname, speechMode);
  const [draft, setDraft] = useState("");

  const khayaTtsLanguage: KhayaPlayTtsLanguage | undefined =
    speechMode === "en" ? undefined : speechMode;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[#bfc9c3]/15 px-3 py-2 dark:border-white/[0.08]">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Chat
          </p>
          <div
            className="flex max-w-full flex-wrap rounded-lg border border-[#bfc9c3]/20 p-0.5 dark:border-white/[0.08]"
            role="group"
            aria-label="Reply language"
          >
            {LANGUAGE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSpeechMode(opt.id)}
                className={cn(
                  "rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
                  speechMode === opt.id
                    ? "bg-[#006c49]/15 text-[#006c49] dark:bg-[#6ffbbe]/15 dark:text-[#6ffbbe]"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
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
              Sales, stock, billing, or where to find a setting — powered by Gemini. Pick a
              language: English uses browser dictation; Twi, Ga, and Ewe use Khaya for voice
              and replies (set KHAYA_API_KEY on the server).
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
          khayaTtsLanguage={khayaTtsLanguage}
        />
        {error ? (
          <p className="px-4 pb-2 text-[13px] text-red-600 dark:text-red-400">{error}</p>
        ) : null}
      </div>
      <CopilotComposer
        value={draft}
        onChange={setDraft}
        speechMode={speechMode}
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
