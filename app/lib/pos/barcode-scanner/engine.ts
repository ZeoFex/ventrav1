import { POS_BARCODE_SCANNER_CONFIG } from "./config";
import { normalizeScannedBarcode } from "./normalize";
import { createBarcodeDetector } from "./create-detector";
import type {
  BarcodeScanEngineCallbacks,
  BarcodeScanEngineOptions,
  DetectedBarcode,
} from "./types";
import { normalizeDetectorResult, zxingFullFrameFallbackSync } from "./zxing-fallback";

type StreakState = {
  rawValue: string;
  count: number;
  lastAt: number;
  best: DetectedBarcode;
};

/**
 * Full-frame, orientation-agnostic scan loop.
 *
 * Architecture:
 * 1. Native BarcodeDetector (or ZXing polyfill) analyzes the entire video frame each tick.
 * 2. On miss, a lighter ZXing multi-rotation fallback runs on a downscaled bitmap.
 * 3. Consecutive identical reads build confidence; accepted scans respect cooldown.
 * 4. All work is async — the UI thread only paints overlay boxes from the latest detection.
 */
export class BarcodeScanEngine {
  private running = false;
  private busy = false;
  private rafId = 0;
  private lastFrameAt = 0;
  private streak: StreakState | null = null;
  private lastAccepted: { rawValue: string; at: number } | null = null;
  private acceptLockedUntil = 0;
  private detector: Awaited<ReturnType<typeof createBarcodeDetector>> | null = null;
  private fallbackCounter = 0;
  private latestOverlay: DetectedBarcode | null = null;
  private paused = false;

  private readonly callbacks: BarcodeScanEngineCallbacks;
  private readonly confidenceThreshold: number;
  private readonly duplicateCooldownMs: number;
  private readonly consecutiveReadsRequired: number;
  private readonly frameIntervalMs: number;
  private readonly skipFramesWhileBusy: boolean;

  constructor(callbacks: BarcodeScanEngineCallbacks, options?: BarcodeScanEngineOptions) {
    this.callbacks = callbacks;
    this.confidenceThreshold =
      options?.confidenceThreshold ?? POS_BARCODE_SCANNER_CONFIG.confidenceThreshold;
    this.duplicateCooldownMs =
      options?.duplicateCooldownMs ?? POS_BARCODE_SCANNER_CONFIG.duplicateCooldownMs;
    this.consecutiveReadsRequired =
      options?.consecutiveReadsRequired ??
      POS_BARCODE_SCANNER_CONFIG.consecutiveReadsRequired;
    this.frameIntervalMs = 1000 / (options?.targetFps ?? POS_BARCODE_SCANNER_CONFIG.targetFps);
    this.skipFramesWhileBusy = POS_BARCODE_SCANNER_CONFIG.skipFramesWhileBusy;
  }

  getLatestOverlay(): DetectedBarcode | null {
    return this.latestOverlay;
  }

  pause(): void {
    this.paused = true;
    this.streak = null;
  }

  resume(): void {
    this.paused = false;
  }

  async start(video: HTMLVideoElement): Promise<"native" | "zxing"> {
    this.detector = await createBarcodeDetector();
    this.running = true;
    this.schedule(video);
    return this.detector.backend;
  }

  stop(): void {
    this.running = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
    this.streak = null;
    this.latestOverlay = null;
    this.detector = null;
    this.paused = false;
  }

  private schedule(video: HTMLVideoElement): void {
    if (!this.running) return;

    this.rafId = requestAnimationFrame(() => {
      void this.tick(video);
    });
  }

  private async tick(video: HTMLVideoElement): Promise<void> {
    if (!this.running) return;

    if (this.paused) {
      this.schedule(video);
      return;
    }

    const now = performance.now();
    if (now - this.lastFrameAt < this.frameIntervalMs) {
      this.schedule(video);
      return;
    }

    if (this.skipFramesWhileBusy && this.busy) {
      this.schedule(video);
      return;
    }

    if (now < this.acceptLockedUntil) {
      this.schedule(video);
      return;
    }

    if (!video.videoWidth || !video.readyState || video.readyState < 2) {
      this.schedule(video);
      return;
    }

    this.lastFrameAt = now;
    this.busy = true;

    try {
      const detection = await this.analyzeFrame(video);
      if (detection) {
        this.latestOverlay = detection;
        this.callbacks.onDetection?.(detection);
        this.processStreak(detection);
      } else {
        this.streak = null;
      }
    } catch (err) {
      this.callbacks.onError?.(err);
    } finally {
      this.busy = false;
      this.schedule(video);
    }
  }

  private async analyzeFrame(video: HTMLVideoElement): Promise<DetectedBarcode | null> {
    const detector = this.detector?.detector;
    if (!detector) return null;

    try {
      const results = await detector.detect(video);
      if (results?.length) {
        const best = results.reduce((a, b) =>
          (b.rawValue?.length ?? 0) > (a.rawValue?.length ?? 0) ? b : a,
        );
        if (best.rawValue?.trim()) {
          return normalizeDetectorResult(best, 0.85);
        }
      }
    } catch {
      // detect() can fail on some frames during exposure changes
    }

    // ZXing multi-rotation fallback on every missed native frame
    this.fallbackCounter += 1;
    const enhance = this.fallbackCounter % 3 === 0;
    return zxingFullFrameFallbackSync(video, { enhance });
  }

  private processStreak(detection: DetectedBarcode): void {
    const value = normalizeScannedBarcode(detection.rawValue);
    if (!value) return;

    const now = Date.now();
    const prev = this.streak;

    if (prev && prev.rawValue === value && now - prev.lastAt < 600) {
      prev.count += 1;
      prev.lastAt = now;
      prev.best = { ...detection, rawValue: value };
    } else {
      this.streak = {
        rawValue: value,
        count: 1,
        lastAt: now,
        best: { ...detection, rawValue: value },
      };
    }

    const streak = this.streak!;
    // Native detections arrive with high base confidence — accept on first read
    const requiredReads =
      detection.confidence >= 0.8 ? 1 : this.consecutiveReadsRequired;
    const confidence = Math.min(1, streak.count / requiredReads);
    const enriched: DetectedBarcode = { ...streak.best, confidence };

    if (confidence < this.confidenceThreshold) return;

    const last = this.lastAccepted;
    if (last && last.rawValue === value && now - last.at < this.duplicateCooldownMs) {
      return;
    }

    this.lastAccepted = { rawValue: value, at: now };
    this.acceptLockedUntil = performance.now() + 180;
    this.streak = null;

    this.callbacks.onAcceptedScan(enriched);
  }
}

/** Map video-space points to overlay canvas coordinates (object-fit: cover). */
export function mapVideoPointToOverlay(
  point: { x: number; y: number },
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
): { x: number; y: number } {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  const cw = canvas.width;
  const ch = canvas.height;
  if (!vw || !vh || !cw || !ch) return point;

  const videoAspect = vw / vh;
  const canvasAspect = cw / ch;

  let scale: number;
  let offsetX = 0;
  let offsetY = 0;

  if (videoAspect > canvasAspect) {
    scale = ch / vh;
    offsetX = (cw - vw * scale) / 2;
  } else {
    scale = cw / vw;
    offsetY = (ch - vh * scale) / 2;
  }

  return {
    x: point.x * scale + offsetX,
    y: point.y * scale + offsetY,
  };
}

export function drawDetectionOverlay(
  ctx: CanvasRenderingContext2D,
  detection: DetectedBarcode | null,
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
): void {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!detection?.cornerPoints?.length) return;

  const mapped = detection.cornerPoints.map((p) =>
    mapVideoPointToOverlay(p, video, canvas),
  );

  // Yellow corner brackets — visible at any rotation (reference: Shopify-style scanner)
  const color = "#FFD60A";
  const bracketLen = Math.min(canvas.width, canvas.height) * 0.06;
  const lineWidth = Math.max(3, bracketLen * 0.12);

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = "round";
  ctx.shadowColor = "rgba(255,214,10,0.45)";
  ctx.shadowBlur = 8;

  const xs = mapped.map((p) => p.x);
  const ys = mapped.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const pad = lineWidth * 1.5;

  const corners: [number, number][] = [
    [minX - pad, minY - pad],
    [maxX + pad, minY - pad],
    [maxX + pad, maxY + pad],
    [minX - pad, maxY + pad],
  ];

  corners.forEach(([x, y], i) => {
    ctx.beginPath();
    if (i === 0) {
      ctx.moveTo(x, y + bracketLen);
      ctx.lineTo(x, y);
      ctx.lineTo(x + bracketLen, y);
    } else if (i === 1) {
      ctx.moveTo(x - bracketLen, y);
      ctx.lineTo(x, y);
      ctx.lineTo(x, y + bracketLen);
    } else if (i === 2) {
      ctx.moveTo(x, y - bracketLen);
      ctx.lineTo(x, y);
      ctx.lineTo(x - bracketLen, y);
    } else {
      ctx.moveTo(x + bracketLen, y);
      ctx.lineTo(x, y);
      ctx.lineTo(x, y - bracketLen);
    }
    ctx.stroke();
  });

  // Confidence pulse at center when locking on
  if (detection.confidence > 0 && detection.confidence < 1) {
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 10, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255,214,10,0.7)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  ctx.restore();
}
