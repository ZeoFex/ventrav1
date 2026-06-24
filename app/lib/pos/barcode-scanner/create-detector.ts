import { getBarcodeDetectorFormats } from "./config";
import { ZxingVideoDetector, type VideoBarcodeDetector } from "./zxing-fallback";

declare global {
  interface Window {
    BarcodeDetector?: new (options?: { formats?: string[] }) => VideoBarcodeDetector;
  }
}

/**
 * Prefer native Shape Detection BarcodeDetector (Chrome/Edge/Android).
 * Falls back to ZXing multi-rotation analysis for Safari/Firefox — no WASM CDN required.
 */
export async function createBarcodeDetector(): Promise<{
  detector: VideoBarcodeDetector;
  backend: "native" | "zxing";
}> {
  const requested = getBarcodeDetectorFormats();

  if (typeof window !== "undefined" && window.BarcodeDetector) {
    try {
      const supported = await (
        window.BarcodeDetector as unknown as {
          getSupportedFormats?: () => Promise<string[]>;
        }
      ).getSupportedFormats?.();

      const formats =
        supported && supported.length > 0
          ? requested.filter((f) => supported.includes(f))
          : requested;

      if (formats.length > 0) {
        return {
          detector: new window.BarcodeDetector({ formats }),
          backend: "native",
        };
      }
    } catch {
      /* use ZXing */
    }
  }

  return {
    detector: new ZxingVideoDetector(),
    backend: "zxing",
  };
}
