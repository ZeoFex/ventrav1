/**
 * Ghana NLP Khaya API (see https://translation.ghananlp.org).
 * Matches official Python SDK: Khaya-AI/khaya-sdk (base_url, paths, headers).
 */

export const KHAYA_DEFAULT_BASE = "https://translation-api.ghananlp.org";

export function getKhayaBaseUrl(): string {
  const u = process.env.KHAYA_API_BASE_URL?.trim();
  if (u) {
    if (!u.startsWith("https://")) {
      throw new Error("KHAYA_API_BASE_URL must use HTTPS");
    }
    return u.replace(/\/$/, "");
  }
  return KHAYA_DEFAULT_BASE;
}

export function getKhayaApiKey(): string | null {
  const k = process.env.KHAYA_API_KEY?.trim();
  return k || null;
}

export function khayaAsrUrl(base: string): string {
  return `${base}/asr/v1/transcribe`;
}

export function khayaTtsUrl(base: string): string {
  return `${base}/tts/v1/tts`;
}

export function khayaTranslateUrl(base: string): string {
  return `${base}/v1/translate`;
}

/**
 * Khaya translation API (SDK: POST json `{ in, lang }` e.g. `lang: "en-tw"`).
 * @see Khaya-AI/khaya-sdk translation.py
 */
export async function khayaTranslate(
  text: string,
  languagePair: string,
  options: { apiKey: string; baseUrl: string },
): Promise<string> {
  const url = khayaTranslateUrl(options.baseUrl);
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": options.apiKey,
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
    },
    body: JSON.stringify({ in: text, lang: languagePair }),
  });
  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(
      `Khaya translate failed (${res.status}): ${errBody.slice(0, 300)}`,
    );
  }
  const raw = await res.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    parsed = raw;
  }
  return parseKhayaAsrJson(parsed);
}

/** Light cleanup so markdown / bullets do not confuse translation or TTS. */
export function plainTextForKhayaSpeech(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

/**
 * Khaya TTS does not read "GHS" well; use a speakable phrase instead.
 */
export function expandGhanaCedisForTts(text: string): string {
  return text
    .replace(/\bGHS\b/gi, "Ghana money")
    .replace(/GH₵/g, "Ghana money");
}

/**
 * Infer audio MIME from magic bytes when the API sends `application/octet-stream` or wrong type
 * (browsers refuse `<audio>` / `Audio()` with empty or non-audio blob types — seen with some Khaya Ga responses).
 */
export function sniffBinaryAudioMimeType(data: ArrayBuffer | Uint8Array): string | null {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  if (bytes.length < 4) return null;

  // RIFF....WAVE
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x41 &&
    bytes[10] === 0x56 &&
    bytes[11] === 0x45
  ) {
    return "audio/wav";
  }

  // ID3 or MPEG frame sync
  if (
    (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0) ||
    (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33)
  ) {
    return "audio/mpeg";
  }

  // Ogg
  if (
    bytes[0] === 0x4f &&
    bytes[1] === 0x67 &&
    bytes[2] === 0x67 &&
    bytes[3] === 0x53
  ) {
    return "audio/ogg";
  }

  // MP4 / M4A (ftyp box)
  if (
    bytes.length >= 12 &&
    bytes[4] === 0x66 &&
    bytes[5] === 0x74 &&
    bytes[6] === 0x79 &&
    bytes[7] === 0x70
  ) {
    return "audio/mp4";
  }

  return null;
}

function parseKhayaStatusCode(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number.parseInt(v, 10);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function khayaJsonErrorDetailLine(o: Record<string, unknown>, raw: string): string {
  if (typeof o.message === "string" && o.message.trim()) return o.message;
  const d = o.detail;
  if (typeof d === "string") return d;
  if (d && typeof d === "object" && !Array.isArray(d)) {
    const inner = d as Record<string, unknown>;
    if (typeof inner.message === "string") return inner.message;
    return JSON.stringify(d);
  }
  return raw.slice(0, 400);
}

/**
 * Turn raw Khaya TTS error text into a short, actionable message for merchants.
 */
export function formatKhayaTtsUserFacingMessage(raw: string): string {
  if (/Language\s+gaa\s+cannot\s+be\s+used/i.test(raw)) {
    return "Ga listen is not enabled on your Khaya API key (the TTS model rejected language “gaa”). Twi and Ewe playback still work. You can keep chatting in Ga; to fix listen, ask Ghana NLP to enable Ga TTS for your subscription.";
  }
  return raw;
}

/** True if buffer looks like JSON `{...}` (after optional UTF-8 BOM / whitespace). WAV/MP3 never start with `{`. */
export function khayaBodyLooksLikeJsonObject(buf: ArrayBuffer): boolean {
  const u8 = new Uint8Array(buf);
  let i = 0;
  if (u8.length >= 3 && u8[0] === 0xef && u8[1] === 0xbb && u8[2] === 0xbf) {
    i = 3;
  }
  while (i < u8.length) {
    const b = u8[i]!;
    if (b === 9 || b === 10 || b === 13 || b === 32) {
      i++;
      continue;
    }
    return b === 0x7b;
  }
  return false;
}

/**
 * Khaya sometimes returns **HTTP 200** with a **JSON error** body (e.g. Azure APIM / `status_code: 400`)
 * instead of audio. Bodies may include UTF-8 BOM, string `status_code`, and `detail: { message }`.
 */
export function readKhayaTtsJsonErrorIfPresent(buf: ArrayBuffer): string | null {
  if (buf.byteLength < 2) return null;
  const text = new TextDecoder("utf-8", { fatal: false })
    .decode(buf)
    .replace(/^\uFEFF/, "")
    .trimStart();
  if (!text.startsWith("{")) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  const o = parsed as Record<string, unknown>;
  const code = parseKhayaStatusCode(o.status_code ?? o.statusCode);

  if (code != null && code >= 400) {
    const detail = khayaJsonErrorDetailLine(o, text);
    return `Khaya TTS refused this request (${code}). ${detail}`;
  }
  if (typeof o.error === "string" && o.error.trim()) {
    return `Khaya TTS: ${o.error}`;
  }
  return null;
}

/**
 * Normalize MIME for Khaya TTS responses.
 * Khaya commonly returns **MP3** bytes (see SDK / docs) but gateways may mislabel as `audio/wav`
 * or `application/octet-stream`. Trust **magic bytes first** so the browser gets a playable Blob type.
 */
export function normalizeKhayaAudioContentType(
  headerValue: string | null,
  body: Uint8Array,
): string {
  const sniffed = sniffBinaryAudioMimeType(body);
  if (sniffed) {
    return sniffed;
  }

  const base = headerValue?.split(";")[0]?.trim() ?? "";
  if (
    base &&
    base !== "application/octet-stream" &&
    base.startsWith("audio/")
  ) {
    return base;
  }

  // Default: Khaya TTS audio is typically MP3 when we could not sniff (e.g. unusual frame alignment).
  return "audio/mpeg";
}

/**
 * Map Khaya TTS language code → `lang` pair for English→target translation (SDK language pairs).
 * Used before TTS when the assistant text is still in English.
 */
export function englishToKhayaTranslationPair(ttsLanguage: string): string | null {
  switch (ttsLanguage) {
    case "tw":
      return "en-tw";
    case "gaa":
      return "en-gaa";
    case "ee":
      return "en-ee";
    case "dag":
      return "en-dag";
    case "yo":
      return "en-yo";
    default:
      return null;
  }
}

/** ASR language codes supported by Khaya (subset used in-app). */
export const KHAYA_ASR_LANGUAGES = [
  "tw",
  "gaa",
  "dag",
  "ee",
  "dga",
  "fat",
  "gur",
  "nzi",
  "kpo",
  "yo",
] as const;

export type KhayaAsrLanguage = (typeof KHAYA_ASR_LANGUAGES)[number];

export function isKhayaAsrLanguage(s: string): s is KhayaAsrLanguage {
  return (KHAYA_ASR_LANGUAGES as readonly string[]).includes(s);
}

/** TTS language codes (Khaya). */
export const KHAYA_TTS_LANGUAGES = ["tw", "gaa", "dag", "ee", "yo"] as const;

export type KhayaTtsLanguage = (typeof KHAYA_TTS_LANGUAGES)[number];

export function isKhayaTtsLanguage(s: string): s is KhayaTtsLanguage {
  return (KHAYA_TTS_LANGUAGES as readonly string[]).includes(s);
}

/**
 * ASR responses may be a JSON string or an object with a text field (defensive).
 */
export function parseKhayaAsrJson(data: unknown): string {
  if (typeof data === "string") return data.trim();
  if (data && typeof data === "object" && "text" in data) {
    const t = (data as { text?: unknown }).text;
    if (typeof t === "string") return t.trim();
  }
  if (data != null) return String(data).trim();
  return "";
}
