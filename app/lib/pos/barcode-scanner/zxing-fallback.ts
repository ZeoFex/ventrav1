import {
  BarcodeFormat,
  BinaryBitmap,
  DecodeHintType,
  HybridBinarizer,
  MultiFormatReader,
  RGBLuminanceSource,
} from "@zxing/library";
import { getBarcodeDetectorFormats, POS_BARCODE_SCANNER_CONFIG } from "./config";
import type { DetectedBarcode } from "./types";

/** Maps Shape Detection format strings to ZXing symbologies. */
const DETECTOR_TO_ZXING: Record<string, BarcodeFormat> = {
  upc_a: BarcodeFormat.UPC_A,
  upc_e: BarcodeFormat.UPC_E,
  ean_8: BarcodeFormat.EAN_8,
  ean_13: BarcodeFormat.EAN_13,
  code_128: BarcodeFormat.CODE_128,
  code_39: BarcodeFormat.CODE_39,
  qr_code: BarcodeFormat.QR_CODE,
  data_matrix: BarcodeFormat.DATA_MATRIX,
};

export type VideoBarcodeDetector = {
  detect: (
    source: ImageBitmapSource,
  ) => Promise<
    {
      rawValue: string;
      format: string;
      cornerPoints?: { x: number; y: number }[];
      boundingBox?: DOMRectReadOnly;
    }[]
  >;
};

let zxingReader: MultiFormatReader | null = null;

function getZxingReader(): MultiFormatReader {
  if (zxingReader) return zxingReader;

  const hints = new Map<DecodeHintType, unknown>();
  const formats = getBarcodeDetectorFormats()
    .map((f) => DETECTOR_TO_ZXING[f])
    .filter(Boolean);

  hints.set(DecodeHintType.POSSIBLE_FORMATS, formats);
  hints.set(DecodeHintType.TRY_HARDER, true);

  zxingReader = new MultiFormatReader();
  zxingReader.setHints(hints);
  return zxingReader;
}

function enhanceContrast(imageData: ImageData): void {
  const { data } = imageData;
  for (let i = 0; i < data.length; i += 4) {
    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    const boosted = lum < 128 ? lum * 0.85 : Math.min(255, lum * 1.12);
    const factor = boosted / (lum || 1);
    data[i] = Math.min(255, data[i] * factor);
    data[i + 1] = Math.min(255, data[i + 1] * factor);
    data[i + 2] = Math.min(255, data[i + 2] * factor);
  }
}

function decodeBitmap(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  rotationDeg: number,
  enhance: boolean,
): DetectedBarcode | null {
  const reader = getZxingReader();
  reader.reset();

  const scratch = document.createElement("canvas");
  scratch.width = width;
  scratch.height = height;
  const sctx = scratch.getContext("2d", { willReadFrequently: true });
  if (!sctx) return null;

  sctx.save();
  if (rotationDeg !== 0) {
    sctx.translate(width / 2, height / 2);
    sctx.rotate((rotationDeg * Math.PI) / 180);
    sctx.translate(-width / 2, -height / 2);
  }
  sctx.drawImage(ctx.canvas, 0, 0, width, height);
  sctx.restore();

  const imageData = sctx.getImageData(0, 0, width, height);
  if (enhance) enhanceContrast(imageData);

  const source = new RGBLuminanceSource(imageData.data, width, height);
  const bitmap = new BinaryBitmap(new HybridBinarizer(source));

  try {
    const result = reader.decodeWithState(bitmap);
    const text = result.getText()?.trim();
    if (!text) return null;

    const points = result.getResultPoints() ?? [];
    const xs = points.map((p) => p.getX());
    const ys = points.map((p) => p.getY());
    const minX = xs.length ? Math.min(...xs) : 0;
    const maxX = xs.length ? Math.max(...xs) : width;
    const minY = ys.length ? Math.min(...ys) : 0;
    const maxY = ys.length ? Math.max(...ys) : height;

    return {
      rawValue: text,
      format: result.getBarcodeFormat()?.toString() ?? "unknown",
      confidence: 0.75,
      cornerPoints: points.map((p) => ({ x: p.getX(), y: p.getY() })),
      boundingBox: {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
      },
    };
  } catch {
    return null;
  } finally {
    reader.reset();
  }
}

function scanVideoFrame(
  video: HTMLVideoElement,
  enhance: boolean,
): DetectedBarcode | null {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return null;

  const scale = POS_BARCODE_SCANNER_CONFIG.zxingFallbackScale;
  const width = Math.max(320, Math.round(vw * scale));
  const height = Math.max(240, Math.round(vh * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  ctx.drawImage(video, 0, 0, width, height);
  const inv = 1 / scale;

  for (const rotation of POS_BARCODE_SCANNER_CONFIG.zxingRotationSteps) {
    const hit = decodeBitmap(ctx, width, height, rotation, enhance);
    if (!hit) continue;

    return {
      ...hit,
      cornerPoints: hit.cornerPoints.map((p) => ({ x: p.x * inv, y: p.y * inv })),
      boundingBox: {
        x: hit.boundingBox.x * inv,
        y: hit.boundingBox.y * inv,
        width: hit.boundingBox.width * inv,
        height: hit.boundingBox.height * inv,
      },
    };
  }

  return null;
}

/**
 * ZXing-backed detector for browsers without native BarcodeDetector (Safari/Firefox).
 */
export class ZxingVideoDetector implements VideoBarcodeDetector {
  private pass = 0;

  async detect(source: ImageBitmapSource): Promise<
    {
      rawValue: string;
      format: string;
      cornerPoints?: { x: number; y: number }[];
      boundingBox?: DOMRectReadOnly;
    }[]
  > {
    if (!(source instanceof HTMLVideoElement)) return [];

    this.pass += 1;
    const enhance = this.pass % 3 === 0;
    const hit = scanVideoFrame(source, enhance);
    if (!hit) return [];

    return [
      {
        rawValue: hit.rawValue,
        format: hit.format,
        cornerPoints: hit.cornerPoints,
        boundingBox: hit.boundingBox as DOMRectReadOnly,
      },
    ];
  }
}

/** Used when native BarcodeDetector misses on a given frame. */
export function zxingFullFrameFallbackSync(
  video: HTMLVideoElement,
  options?: { enhance?: boolean },
): DetectedBarcode | null {
  return scanVideoFrame(video, options?.enhance ?? false);
}

export function normalizeDetectorResult(
  raw: {
    rawValue: string;
    format: string;
    cornerPoints?: { x: number; y: number }[];
    boundingBox?: DOMRectReadOnly | { x: number; y: number; width: number; height: number };
  },
  confidence: number,
): DetectedBarcode {
  const box = raw.boundingBox;
  const corners = raw.cornerPoints ?? [];

  return {
    rawValue: raw.rawValue.trim(),
    format: raw.format,
    confidence,
    cornerPoints: corners.length
      ? corners.map((p) => ({ x: p.x, y: p.y }))
      : box
        ? [
            { x: box.x, y: box.y },
            { x: box.x + box.width, y: box.y },
            { x: box.x + box.width, y: box.y + box.height },
            { x: box.x, y: box.y + box.height },
          ]
        : [],
    boundingBox: box
      ? { x: box.x, y: box.y, width: box.width, height: box.height }
      : { x: 0, y: 0, width: 0, height: 0 },
  };
}
