"use client";

import { useEffect, useRef, useState } from "react";

/** Matches the POS layout breakpoint used for desktop scanner / phone relay split. */
export function useIsDesktopLayout(): boolean {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    setDesktop(mq.matches);
    const fn = () => setDesktop(mq.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);
  return desktop;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
    return true;
  }
  if (target instanceof HTMLSelectElement) return true;
  return target.isContentEditable;
}

/**
 * Captures keyboard-wedge barcode scanners (USB scanners that type digits + Enter).
 * Only runs when `enabled` — use on POS browse so staff can scan without opening a dialog.
 */
export function usePosKeyboardWedge(opts: {
  enabled: boolean;
  onBarcode: (raw: string) => void;
}) {
  const { enabled, onBarcode } = opts;
  const bufferRef = useRef("");
  const onBarcodeRef = useRef(onBarcode);
  onBarcodeRef.current = onBarcode;

  useEffect(() => {
    if (!enabled) {
      bufferRef.current = "";
      return;
    }

    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;

      if (e.key === "Enter") {
        e.preventDefault();
        const raw = bufferRef.current;
        bufferRef.current = "";
        if (raw.trim()) onBarcodeRef.current(raw);
        return;
      }
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        bufferRef.current += e.key;
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled]);
}
