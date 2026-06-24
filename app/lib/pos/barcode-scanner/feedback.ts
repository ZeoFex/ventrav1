import { playPosAddProductBeep } from "@/app/components/dashboard/pos/sale/pos-add-beep";

/** Short haptic pulse when `navigator.vibrate` is available (mobile). */
export function triggerPosScanHaptic(): void {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") {
    return;
  }
  try {
    navigator.vibrate([35, 20, 35]);
  } catch {
    // Some browsers expose vibrate but reject patterns
    try {
      navigator.vibrate(50);
    } catch {
      /* ignore */
    }
  }
}

/** Beep + haptic — call after a scan passes confidence and cooldown gates. */
export function playPosScanSuccessFeedback(): void {
  playPosAddProductBeep();
  triggerPosScanHaptic();
}
