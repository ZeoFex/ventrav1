/** Shared types for the POS camera barcode pipeline. */

export type BarcodeFormatId =
  | "upc-a"
  | "upc-e"
  | "ean-8"
  | "ean-13"
  | "code-128"
  | "code-39"
  | "qr-code"
  | "data-matrix";

/** One configured symbology — extend the registry to add formats without touching the engine. */
export type BarcodeFormatDefinition = {
  id: BarcodeFormatId;
  /** Shape Detection API / BarcodeDetector format string */
  barcodeDetectorFormat: string;
  /** Human-readable label for debug UI */
  label: string;
  enabled: boolean;
};

export type DetectedBarcode = {
  rawValue: string;
  format: string;
  /** Normalized 0–1 confidence from consecutive-frame agreement */
  confidence: number;
  /** Corner points in source video pixel space */
  cornerPoints: { x: number; y: number }[];
  boundingBox: { x: number; y: number; width: number; height: number };
};

export type BarcodeScanEngineCallbacks = {
  onDetection?: (detection: DetectedBarcode) => void;
  /** Fired once per unique barcode after confidence + cooldown gates pass */
  onAcceptedScan: (detection: DetectedBarcode) => void;
  onError?: (error: unknown) => void;
};

export type BarcodeScanEngineOptions = {
  /** Override defaults from config (e.g. A/B tests) */
  confidenceThreshold?: number;
  duplicateCooldownMs?: number;
  /** Minimum identical reads before accepting (stabilizes noisy frames) */
  consecutiveReadsRequired?: number;
  targetFps?: number;
};
