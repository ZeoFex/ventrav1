"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { COPILOT_FEATURE_ID } from "@/config/plan-feature-access";
import { UpgradeTooltip } from "@/app/components/dashboard/sidebar/upgrade-tooltip";
import { useCopilot } from "./copilot-context";
import { cn } from "@/lib/utils";
import { COPILOT_MASCOT_SRC } from "./copilot-mascot-avatar";

/** Static poster (instant paint). Same as chat mascot + avatar. */
const COPILOT_FAB_POSTER = COPILOT_MASCOT_SRC;
/**
 * Drop a seamless loop next to this file under `public/`:
 * - `copilot-fab-loop.webm` (required for animation — VP9, small resolution, ~2–4s loop)
 * - `copilot-fab-loop.mp4` (optional H.264 fallback; only fetched if WebM isn’t used)
 */
const COPILOT_FAB_LOOP_WEBM = "/copilot-fab-loop.webm";
const COPILOT_FAB_LOOP_MP4 = "/copilot-fab-loop.mp4";

function CopilotFabMascot() {
  const [loadVideo, setLoadVideo] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(
        () => setLoadVideo(true),
        { timeout: 2800 },
      );
      return () => window.cancelIdleCallback(id);
    }
    const t = window.setTimeout(() => setLoadVideo(true), 2800);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!loadVideo || videoFailed) return;
    const v = videoRef.current;
    if (!v) return;
    const p = v.play();
    if (p !== undefined) void p.catch(() => setVideoFailed(true));
  }, [loadVideo, videoFailed]);

  return (
    <span className="relative block size-12 drop-shadow-[0_2px_6px_rgba(0,30,20,0.32)] dark:drop-shadow-[0_2px_8px_rgba(0,0,0,0.38)]">
      {loadVideo && !videoFailed ? (
        <video
          ref={videoRef}
          className="size-full object-contain object-center"
          poster={COPILOT_FAB_POSTER}
          muted
          playsInline
          loop
          autoPlay
          preload="none"
          aria-hidden
          onError={() => setVideoFailed(true)}
        >
          <source src={COPILOT_FAB_LOOP_WEBM} type="video/webm" />
          <source src={COPILOT_FAB_LOOP_MP4} type="video/mp4" />
        </video>
      ) : (
        <Image
          src={COPILOT_FAB_POSTER}
          alt=""
          width={112}
          height={112}
          className="size-full object-contain object-center"
        />
      )}
    </span>
  );
}

/**
 * Floating Zuri entry for small screens (sidebar trigger is easy to miss on mobile).
 * Placed bottom-left so it does not overlap the quick cart FAB (bottom-right).
 */
export function CopilotMobileFab() {
  const { toggle, copilotEnabled } = useCopilot();

  const button = (
    <button
      type="button"
      onClick={copilotEnabled ? toggle : undefined}
      disabled={!copilotEnabled}
      className={cn(
        "fixed z-[55] flex size-14 items-center justify-center rounded-full p-1 transition-transform",
        "bg-gradient-to-b from-[#12a06f] via-[#006c49] to-[#002f1f]",
        "shadow-[0_5px_18px_rgba(0,44,30,0.4),inset_0_1px_0_rgba(255,255,255,0.26),inset_0_-3px_0_rgba(0,0,0,0.2)]",
        "border border-white/25 dark:border-[#6ffbbe]/30",
        "dark:from-[#8fffd4] dark:via-[#6ffbbe] dark:to-[#004d33]",
        "dark:shadow-[0_6px_22px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.32),inset_0_-3px_0_rgba(0,0,0,0.14)]",
        "bottom-[max(1rem,env(safe-area-inset-bottom))] left-4",
        "hover:scale-[1.03] hover:brightness-[1.04] active:scale-[0.98] active:brightness-[0.98]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6ffbbe] focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        !copilotEnabled && "cursor-not-allowed opacity-75",
      )}
      aria-label={copilotEnabled ? "Open Zuri" : "Zuri (Pro plan)"}
      title={
        copilotEnabled ? "Zuri (Ctrl+/)" : "Upgrade to Pro to use Zuri"
      }
    >
      <CopilotFabMascot />
    </button>
  );

  if (!copilotEnabled) {
    return (
      <div className="lg:hidden">
        <UpgradeTooltip featureId={COPILOT_FEATURE_ID}>{button}</UpgradeTooltip>
      </div>
    );
  }

  return <div className="lg:hidden">{button}</div>;
}
