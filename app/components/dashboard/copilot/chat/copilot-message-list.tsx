"use client";

import { CopilotMarkdown } from "./copilot-markdown";
import { CopilotToolTimeline } from "../tools/copilot-tool-timeline";
import type { ChatTurn, ToolRowState } from "../types";

export function CopilotMessageList({
  turns,
  pendingText,
  pendingTools,
  streaming,
}: {
  turns: ChatTurn[];
  pendingText: string;
  pendingTools: ToolRowState[];
  streaming: boolean;
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
            <CopilotMarkdown text={t.content} />
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
