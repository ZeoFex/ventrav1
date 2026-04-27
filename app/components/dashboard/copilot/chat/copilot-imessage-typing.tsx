"use client";

import { cn } from "@/lib/utils";

type CopilotImessageTypingProps = {
  className?: string;
};

/**
 * Compact “typing…” pill with three wave-animated dots (iMessage-style).
 */
export function CopilotImessageTyping({ className }: CopilotImessageTypingProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center justify-center gap-[5px] rounded-[1.15rem] px-4 py-3 shadow-sm",
        "bg-[#e5e5ea] dark:bg-[#2c2c2e]",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-label="Copilot is typing"
    >
      <span
        className="copilot-imessage-dot size-2.5 rounded-full bg-[#8e8e93] dark:bg-[#a1a1a6]"
        aria-hidden
      />
      <span
        className="copilot-imessage-dot size-2.5 rounded-full bg-[#8e8e93] dark:bg-[#a1a1a6]"
        aria-hidden
      />
      <span
        className="copilot-imessage-dot size-2.5 rounded-full bg-[#8e8e93] dark:bg-[#a1a1a6]"
        aria-hidden
      />
    </div>
  );
}
