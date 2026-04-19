"use client";

import { CopilotMarkdown } from "./copilot-markdown";
import {
  CopilotKhayaPlay,
  type KhayaPlayTtsLanguage,
} from "./copilot-khaya-play";
import { CopilotToolTimeline } from "../tools/copilot-tool-timeline";
import type { ChatTurn, ToolRowState } from "../types";

export function CopilotMessageList({
  turns,
  pendingText,
  pendingTools,
  streaming,
  khayaTtsLanguage,
}: {
  turns: ChatTurn[];
  pendingText: string;
  pendingTools: ToolRowState[];
  streaming: boolean;
  /** Khaya TTS language for listen button (Twi / Ga / Ewe); omit when English */
  khayaTtsLanguage?: KhayaPlayTtsLanguage;
}) {
  return (
    <div className="space-y-4 px-3 py-4">
      {turns.map((t, i) => (
        <div
          key={`${i}-${t.role}`}
          className={
            t.role === "user"
              ? "ml-8 rounded-2xl rounded-br-md border border-[#bfc9c3]/15 bg-surface-elevated px-4 py-3 text-[15px] leading-relaxed dark:border-white/[0.08] dark:bg-[#1a1a1a]"
              : "mr-6 rounded-2xl rounded-bl-md border border-[#bfc9c3]/10 bg-white/60 px-4 py-3 text-foreground dark:border-white/[0.06] dark:bg-[#141414]"
          }
        >
          {t.role === "assistant" ? (
            <div className="flex gap-2">
              <div className="min-w-0 flex-1">
                <CopilotMarkdown text={t.content} />
              </div>
              {khayaTtsLanguage ? (
                <CopilotKhayaPlay
                  text={t.content}
                  ttsLanguage={khayaTtsLanguage}
                />
              ) : null}
            </div>
          ) : (
            <p className="whitespace-pre-wrap">{t.content}</p>
          )}
        </div>
      ))}
      {(pendingText || pendingTools.length > 0) && streaming ? (
        <div className="mr-6 space-y-2 rounded-2xl rounded-bl-md border border-[#006c49]/20 bg-[#006c49]/[0.06] px-4 py-3 dark:border-[#6ffbbe]/25 dark:bg-[#6ffbbe]/[0.06]">
          <CopilotToolTimeline tools={pendingTools} />
          {pendingText ? (
            <div className="text-[15px] leading-relaxed">
              <CopilotMarkdown text={pendingText} />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
