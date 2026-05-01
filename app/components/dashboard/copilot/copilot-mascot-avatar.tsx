"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

/** Same static art as the mobile Zuri FAB; lightweight for chat (no video). */
export const COPILOT_MASCOT_SRC = "/3d%20fab.png";

const SIZE_PX = { xs: 24, sm: 28, md: 36, lg: 48, xl: 64 } as const;

type CopilotMascotAvatarProps = {
  size?: keyof typeof SIZE_PX;
  className?: string;
  /** For decorative use next to visible labels */
  "aria-hidden"?: boolean;
};

export function CopilotMascotAvatar({
  size = "md",
  className,
  "aria-hidden": ariaHidden,
}: CopilotMascotAvatarProps) {
  const px = SIZE_PX[size];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#bfc9c3]/20 bg-gradient-to-b from-white/90 to-[#f0f4f1] shadow-sm ring-1 ring-black/[0.04] dark:border-white/[0.12] dark:from-[#1c1c1c] dark:to-[#0f0f0f] dark:ring-white/[0.04]",
        size === "xs" && "size-6",
        size === "sm" && "size-7",
        size === "md" && "size-9",
        size === "lg" && "size-12",
        size === "xl" && "size-16",
        className,
      )}
      aria-hidden={ariaHidden ?? true}
    >
      <Image
        src={COPILOT_MASCOT_SRC}
        alt=""
        width={px * 2}
        height={px * 2}
        className="size-full object-contain object-center p-0.5"
        sizes={`${px}px`}
      />
    </span>
  );
}
