"use client";

import type { ReactNode } from "react";
import { CopilotMarkdown } from "./copilot-markdown";
import {
  CopilotKhayaPlay,
  type KhayaPlayTtsLanguage,
} from "./copilot-khaya-play";
import { CopilotImessageTyping } from "./copilot-imessage-typing";
import { CopilotToolTimeline } from "../tools/copilot-tool-timeline";
import { CopilotMascotAvatar } from "../copilot-mascot-avatar";
import type { ChatTurn, ToolRowState } from "../types";
import { cn } from "@/lib/utils";

/** iMessage-like incoming bubble (assistant). */
const incomingBubble =
  "rounded-[1.3rem] rounded-bl-[0.32rem] bg-[#e5e5ea] px-3.5 py-2.5 text-[15px] leading-relaxed text-[#1c1c1c] shadow-[0_1px_0.5px_rgba(0,0,0,0.1)] dark:bg-[#2c2c2e] dark:text-zinc-100 dark:shadow-[0_1px_0.5px_rgba(0,0,0,0.4)]";

/** iMessage-like outgoing (user) — Ventra green instead of iOS blue. */
const outgoingBubble =
  "rounded-[1.3rem] rounded-br-[0.32rem] bg-gradient-to-b from-[#0d9665] to-[#006c49] px-3.5 py-2.5 text-[15px] leading-relaxed text-white shadow-[0_1px_0.5px_rgba(0,0,0,0.2)] dark:from-[#0f9f6a] dark:to-[#0a6b47] dark:text-white/98";

const toolsShell =
  "rounded-[1.15rem] rounded-bl-[0.3rem] border border-[#d1d1d6] bg-white/60 px-3 py-2.5 dark:border-white/[0.12] dark:bg-[#1c1c1e]/80";

function AssistantRow({
  children,
  className,
  streaming,
}: {
  children: ReactNode;
  className?: string;
  /** Slight ring on mascot while a reply is in flight */
  streaming?: boolean;
}) {
  return (
    <div className={cn("flex w-full justify-start", className)}>
      <div className="flex max-w-[min(92%,30rem)] items-end gap-2">
        <div className="shrink-0 pb-0.5">
          <CopilotMascotAvatar
            size="sm"
            className={cn(
              "shadow-sm",
              streaming &&
                "ring-2 ring-[#006c49]/20 dark:ring-[#6ffbbe]/30",
            )}
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5 pb-0.5">
          {children}
        </div>
      </div>
    </div>
  );
}

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
  const showTyping = streaming && !pendingText.trim();
  const showStreamBlock =
    streaming && (showTyping || pendingTools.length > 0 || pendingText.trim().length > 0);

  return (
    <div className="flex w-full flex-col gap-2.5 px-2 py-3">
      {turns.map((t, i) =>
        t.role === "user" ? (
          <div
            key={`${i}-user`}
            className="flex w-full flex-wrap justify-end gap-1 pl-8"
          >
            <div
              className={cn(
                "max-w-[min(80%,24rem)] break-words [word-break:break-word]",
                outgoingBubble,
              )}
            >
              <p className="whitespace-pre-wrap">{t.content}</p>
            </div>
          </div>
        ) : (
          <AssistantRow key={`${i}-asst`} streaming={false}>
            <div
              className={cn(
                "min-w-0 [overflow-wrap:anywhere]",
                incomingBubble,
                khayaTtsLanguage ? "pr-1" : undefined,
              )}
            >
              <div className="flex gap-1.5">
                <div className="min-w-0 flex-1 [&_strong]:text-[#1c1c1c] dark:[&_strong]:text-zinc-50">
                  <CopilotMarkdown text={t.content} />
                </div>
                {khayaTtsLanguage ? (
                  <div className="shrink-0 self-start pt-0.5">
                    <CopilotKhayaPlay
                      text={t.content}
                      ttsLanguage={khayaTtsLanguage}
                    />
                  </div>
                ) : null}
              </div>
            </div>
          </AssistantRow>
        ),
      )}

      {showStreamBlock ? (
        <AssistantRow streaming>
          {pendingTools.length > 0 ? (
            <div className={cn("w-full", toolsShell)}>
              <CopilotToolTimeline tools={pendingTools} />
            </div>
          ) : null}
          {showTyping ? <CopilotImessageTyping className="w-fit" /> : null}
          {pendingText.trim() ? (
            <div
              className={cn(
                "min-w-0 [overflow-wrap:anywhere] [&_strong]:text-[#1c1c1c] dark:[&_strong]:text-zinc-50",
                incomingBubble,
                khayaTtsLanguage ? "pr-1" : undefined,
              )}
            >
              <div className="flex gap-1.5">
                <div className="min-w-0 flex-1">
                  <CopilotMarkdown text={pendingText} />
                </div>
                {khayaTtsLanguage ? (
                  <div className="shrink-0 self-start pt-0.5">
                    <CopilotKhayaPlay
                      text={pendingText}
                      ttsLanguage={khayaTtsLanguage}
                    />
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </AssistantRow>
      ) : null}
    </div>
  );
}
