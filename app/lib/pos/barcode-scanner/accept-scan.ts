/**
 * Gates live camera reads so a noisy frame cannot change the barcode
 * that gets added to the sale.
 */

export const QUAGGA_MAX_MEDIAN_ERROR = 0.15;
/** EAN/UPC already fail closed on a bad check digit, so the frame can be a little noisier. */
export const QUAGGA_CHECKED_MAX_MEDIAN_ERROR = 0.25;
export const CAMERA_DUPLICATE_COOLDOWN_MS = 800;
export const CAMERA_CONFIRM_WINDOW_MS = 500;

export type CameraAcceptState = {
  pendingCode: string | null;
  pendingAt: number;
  lastEmitted: string | null;
  lastEmittedAt: number;
};

export const EMPTY_CAMERA_ACCEPT_STATE: CameraAcceptState = {
  pendingCode: null,
  pendingAt: 0,
  lastEmitted: null,
  lastEmittedAt: 0,
};

/** GS1 mod-10 check digit used by EAN-8, EAN-13, and UPC-A. */
export function gs1CheckDigit(body: string): number {
  let sum = 0;
  for (let i = 0; i < body.length; i++) {
    const n = body.charCodeAt(body.length - 1 - i) - 48;
    if (n < 0 || n > 9) return -1;
    sum += n * (i % 2 === 0 ? 3 : 1);
  }
  return (10 - (sum % 10)) % 10;
}

export function hasValidGs1CheckDigit(code: string): boolean {
  if (!/^\d{8,14}$/.test(code)) return false;
  const expected = gs1CheckDigit(code.slice(0, -1));
  return expected === Number(code[code.length - 1]);
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1]! + sorted[mid]!) / 2
    : sorted[mid]!;
}

export function passesQuaggaQuality(
  errors: Array<number | undefined>,
  maxMedian = QUAGGA_MAX_MEDIAN_ERROR,
): boolean {
  const nums = errors.filter(
    (n): n is number => typeof n === "number" && Number.isFinite(n),
  );
  const value = median(nums);
  return value !== null && value <= maxMedian;
}

const CHECKED_LENGTH: Record<string, number> = {
  ean_13: 13,
  ean_reader: 13,
  ean_8: 8,
  ean_8_reader: 8,
  upc_a: 12,
  upc_reader: 12,
};

function isCheckedFormat(format: string): boolean {
  return format in CHECKED_LENGTH;
}

/**
 * Reject reads whose length or check digit does not match the symbology.
 * The returned code is only trimmed — digits are never rewritten.
 */
export function isIntactBarcode(code: string, format?: string): boolean {
  const trimmed = code.trim();
  if (!trimmed || trimmed.length > 80) return false;
  if (/[\u0000-\u001F\u007F]/.test(trimmed)) return false;

  const fmt = (format ?? "").toLowerCase();
  const expected = CHECKED_LENGTH[fmt];
  if (expected) {
    return trimmed.length === expected && hasValidGs1CheckDigit(trimmed);
  }

  // Format missing: still refuse a 12/13-digit code with a bad check digit.
  if (!fmt && /^\d{12}$|^\d{13}$/.test(trimmed)) {
    return hasValidGs1CheckDigit(trimmed);
  }

  if (fmt === "upc_e" || fmt === "upc_e_reader") {
    return /^\d{6,8}$/.test(trimmed);
  }

  return trimmed.length >= 4 && /^[\x20-\x7E]+$/.test(trimmed);
}

export function acceptCameraDecode(args: {
  code: string;
  format?: string;
  errors: Array<number | undefined>;
  now: number;
  state: CameraAcceptState;
}): { emit: string | null; state: CameraAcceptState } {
  const code = args.code.trim();
  const fmt = (args.format ?? "").toLowerCase();
  const gs1WithoutFormat = !fmt && /^\d{12}$|^\d{13}$/.test(code);
  const checked = isCheckedFormat(fmt) || gs1WithoutFormat;
  if (
    !passesQuaggaQuality(
      args.errors,
      checked ? QUAGGA_CHECKED_MAX_MEDIAN_ERROR : QUAGGA_MAX_MEDIAN_ERROR,
    ) ||
    !isIntactBarcode(code, args.format)
  ) {
    return { emit: null, state: args.state };
  }

  const { state, now } = args;
  if (
    state.lastEmitted === code &&
    now - state.lastEmittedAt < CAMERA_DUPLICATE_COOLDOWN_MS
  ) {
    return { emit: null, state };
  }

  const needsConfirm = !checked;
  if (needsConfirm) {
    const confirmed =
      state.pendingCode === code && now - state.pendingAt <= CAMERA_CONFIRM_WINDOW_MS;
    if (!confirmed) {
      return {
        emit: null,
        state: { ...state, pendingCode: code, pendingAt: now },
      };
    }
  }

  return {
    emit: code,
    state: {
      pendingCode: null,
      pendingAt: 0,
      lastEmitted: code,
      lastEmittedAt: now,
    },
  };
}
