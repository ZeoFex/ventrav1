import type { BarcodeFormatDefinition, BarcodeFormatId } from "./types";

/**
 * Central POS scanner tuning — adjust thresholds here without touching engine code.
 * Formats are registered in `format-registry.ts`; enable/disable symbologies there.
 */
export const POS_BARCODE_SCANNER_CONFIG = {
  /** Normalized confidence (0–1) required before emitting a scan */
  confidenceThreshold: 0.72,
  /** Suppress duplicate reads of the same payload */
  duplicateCooldownMs: 1200,
  /** Identical decodes across consecutive frames before acceptance */
  consecutiveReadsRequired: 2,
  /** Target analysis rate — balances CPU vs responsiveness */
  targetFps: 14,
  /** Skip scheduling new frames while a detect() call is in flight */
  skipFramesWhileBusy: true,
  /** Downscale factor for ZXing rotation fallback (1 = full res, 0.5 = half) */
  zxingFallbackScale: 0.65,
  /** Rotations attempted on fallback path: 0°, 90°, 180°, 270° */
  zxingRotationSteps: [0, 90, 180, 270] as const,
  /** Camera constraints — continuous focus helps nearby products */
  camera: {
    facingMode: "environment" as const,
    width: { min: 640, ideal: 1920 },
    height: { min: 480, ideal: 1080 },
    focusMode: "continuous" as const,
  },
} as const;

/** Lookup enabled format IDs for runtime hints */
export function getEnabledFormatIds(
  registry: readonly BarcodeFormatDefinition[] = BARCODE_FORMAT_REGISTRY,
): BarcodeFormatId[] {
  return registry.filter((f) => f.enabled).map((f) => f.id);
}

/**
 * Registry of supported symbologies.
 * To add a format: append an entry with `enabled: true` and ensure the
 * BarcodeDetector string matches the Shape Detection spec.
 */
export const BARCODE_FORMAT_REGISTRY: readonly BarcodeFormatDefinition[] = [
  {
    id: "upc-a",
    barcodeDetectorFormat: "upc_a",
    label: "UPC-A",
    enabled: true,
  },
  {
    id: "upc-e",
    barcodeDetectorFormat: "upc_e",
    label: "UPC-E",
    enabled: true,
  },
  {
    id: "ean-8",
    barcodeDetectorFormat: "ean_8",
    label: "EAN-8",
    enabled: true,
  },
  {
    id: "ean-13",
    barcodeDetectorFormat: "ean_13",
    label: "EAN-13",
    enabled: true,
  },
  {
    id: "code-128",
    barcodeDetectorFormat: "code_128",
    label: "Code 128",
    enabled: true,
  },
  {
    id: "code-39",
    barcodeDetectorFormat: "code_39",
    label: "Code 39",
    enabled: true,
  },
  {
    id: "qr-code",
    barcodeDetectorFormat: "qr_code",
    label: "QR Code",
    enabled: true,
  },
  {
    id: "data-matrix",
    barcodeDetectorFormat: "data_matrix",
    label: "Data Matrix",
    enabled: true,
  },
] as const;

export function getBarcodeDetectorFormats(
  registry: readonly BarcodeFormatDefinition[] = BARCODE_FORMAT_REGISTRY,
): string[] {
  return registry.filter((f) => f.enabled).map((f) => f.barcodeDetectorFormat);
}
