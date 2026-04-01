"use client";

import { useEffect, useId, useRef } from "react";

type PosBarcodeCameraProps = {
  active: boolean;
  onScan: (decodedText: string) => void;
  className?: string;
};

/**
 * Camera scanner optimised for printed Code 128 barcodes.
 * High FPS, narrow format list, wide rectangular scan region.
 */
export function PosBarcodeCamera({
  active,
  onScan,
  className,
}: PosBarcodeCameraProps) {
  const reactId = useId();
  const containerId = `pos-bc-${reactId.replace(/:/g, "")}`;
  const onScanRef = useRef(onScan);
  const lastRef = useRef<{ text: string; at: number } | null>(null);
  onScanRef.current = onScan;

  useEffect(() => {
    if (!active) return;

    let cancelled = false;
    const scannerRef: { current: import("html5-qrcode").Html5Qrcode | null } =
      { current: null };

    async function start() {
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import(
        "html5-qrcode",
      );
      if (cancelled) return;
      await new Promise((r) => requestAnimationFrame(r));
      if (!document.getElementById(containerId) || cancelled) return;

      const scanner = new Html5Qrcode(containerId, {
        verbose: false,
        formatsToSupport: [
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.EAN_13,
        ],
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true,
        },
      });
      scannerRef.current = scanner;

      try {
        await scanner.start(
          { facingMode: "environment" },
          { fps: 15 },
          (decodedText) => {
            const now = Date.now();
            const prev = lastRef.current;
            if (
              prev &&
              prev.text === decodedText &&
              now - prev.at < 400
            ) {
              return;
            }
            lastRef.current = { text: decodedText, at: now };
            onScanRef.current(decodedText);
          },
          () => undefined,
        );
      } catch {
        // Camera permission / no device — parent may show message
      }
    }

    void start();

    return () => {
      cancelled = true;
      const s = scannerRef.current;
      if (s) {
        s.stop()
          .then(() => s.clear())
          .catch(() => undefined);
      }
    };
  }, [active, containerId]);

  if (!active) return null;

  return (
    <div
      id={containerId}
      className={className}
      aria-hidden={false}
    />
  );
}
