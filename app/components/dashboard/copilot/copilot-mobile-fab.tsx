"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
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

const FAB_SIZE_PX = 56;
const DRAG_THRESHOLD_PX = 8;
const POSITION_STORAGE_KEY = "ventrapos-copilot-fab-position";

type FabPosition = { x: number; y: number };

let cachedSafeAreaBottom: number | null = null;

function readSafeAreaBottom(): number {
  if (cachedSafeAreaBottom !== null) return cachedSafeAreaBottom;
  if (typeof window === "undefined") return 0;
  const probe = document.createElement("div");
  probe.style.cssText =
    "position:fixed;bottom:0;left:0;padding-bottom:env(safe-area-inset-bottom);visibility:hidden;pointer-events:none;";
  document.body.appendChild(probe);
  cachedSafeAreaBottom = probe.offsetHeight;
  document.body.removeChild(probe);
  return cachedSafeAreaBottom;
}

function clampFabPosition(x: number, y: number): FabPosition {
  const pad = 8;
  const w = window.innerWidth;
  const h = window.innerHeight;
  const safeBottom = readSafeAreaBottom();
  return {
    x: Math.max(pad, Math.min(x, w - FAB_SIZE_PX - pad)),
    y: Math.max(pad, Math.min(y, h - FAB_SIZE_PX - pad - safeBottom)),
  };
}

function defaultFabPosition(): FabPosition {
  const bottomNavReserve = 76;
  const side = 16;
  const y =
    window.innerHeight - FAB_SIZE_PX - bottomNavReserve - Math.max(16, readSafeAreaBottom());
  return clampFabPosition(side, y);
}

function readStoredPosition(): FabPosition | null {
  try {
    const raw = localStorage.getItem(POSITION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FabPosition;
    if (typeof parsed.x !== "number" || typeof parsed.y !== "number") return null;
    return clampFabPosition(parsed.x, parsed.y);
  } catch {
    return null;
  }
}

function persistPosition(pos: FabPosition) {
  try {
    localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify(pos));
  } catch {
    /* private mode */
  }
}

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
 * Floating Zuri entry for small screens. Draggable so it can be moved away from
 * the cart FAB and bottom navigation.
 */
export function CopilotMobileFab() {
  const { toggle, copilotEnabled } = useCopilot();
  const [position, setPosition] = useState<FabPosition | null>(null);
  const dragRef = useRef({
    active: false,
    moved: false,
    pointerId: -1,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
  });

  useEffect(() => {
    setPosition(readStoredPosition() ?? defaultFabPosition());

    const onResize = () => {
      setPosition((prev) => (prev ? clampFabPosition(prev.x, prev.y) : prev));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const finishDrag = useCallback(
    (next: FabPosition, wasMoved: boolean) => {
      setPosition(next);
      persistPosition(next);
      if (!wasMoved && copilotEnabled) {
        toggle();
      }
    },
    [copilotEnabled, toggle],
  );

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!position || e.button !== 0) return;
    dragRef.current = {
      active: true,
      moved: false,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originX: position.x,
      originY: position.y,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag.active || e.pointerId !== drag.pointerId) return;

    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (!drag.moved && (Math.abs(dx) > DRAG_THRESHOLD_PX || Math.abs(dy) > DRAG_THRESHOLD_PX)) {
      drag.moved = true;
    }
    if (drag.moved) {
      setPosition(clampFabPosition(drag.originX + dx, drag.originY + dy));
    }
  };

  const onPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag.active || e.pointerId !== drag.pointerId || !position) return;

    const wasMoved = drag.moved;
    drag.active = false;
    drag.moved = false;

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }

    const next = wasMoved
      ? clampFabPosition(
          drag.originX + (e.clientX - drag.startX),
          drag.originY + (e.clientY - drag.startY),
        )
      : position;

    finishDrag(next, wasMoved);
  };

  const onPointerCancel = (e: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag.active || e.pointerId !== drag.pointerId) return;
    drag.active = false;
    drag.moved = false;
  };

  if (!position) {
    return null;
  }

  const button = (
    <button
      type="button"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      disabled={!copilotEnabled}
      style={{ left: position.x, top: position.y }}
      className={cn(
        "fixed z-[55] flex size-14 touch-none select-none items-center justify-center rounded-full p-1 transition-[box-shadow,filter] duration-150",
        "bg-gradient-to-b from-[#12a06f] via-[#006c49] to-[#002f1f]",
        "shadow-[0_5px_18px_rgba(0,44,30,0.4),inset_0_1px_0_rgba(255,255,255,0.26),inset_0_-3px_0_rgba(0,0,0,0.2)]",
        "border border-white/25 dark:border-[#6ffbbe]/30",
        "dark:from-[#8fffd4] dark:via-[#6ffbbe] dark:to-[#004d33]",
        "dark:shadow-[0_6px_22px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.32),inset_0_-3px_0_rgba(0,0,0,0.14)]",
        "cursor-grab active:cursor-grabbing active:scale-[0.98] active:brightness-[0.98]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6ffbbe] focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        !copilotEnabled && "cursor-not-allowed opacity-75",
      )}
      aria-label={copilotEnabled ? "Open Zuri — drag to move" : "Zuri (Pro plan)"}
      title={copilotEnabled ? "Zuri — tap to open, drag to move" : "Upgrade to Pro to use Zuri"}
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
