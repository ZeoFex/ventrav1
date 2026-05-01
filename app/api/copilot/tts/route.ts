import { NextResponse } from "next/server";
import { requireUserAuth } from "@/server/auth/api-request-auth";
import { isCopilotRateLimited } from "@/app/lib/copilot/rate-limit";
import { copilotAccessDeniedResponse } from "@/app/lib/copilot/plan-access";
import {
  englishToKhayaTranslationPair,
  expandGhanaCedisForTts,
  formatKhayaTtsUserFacingMessage,
  getKhayaApiKey,
  getKhayaBaseUrl,
  isKhayaTtsLanguage,
  khayaBodyLooksLikeJsonObject,
  khayaTtsUrl,
  khayaTranslate,
  normalizeKhayaAudioContentType,
  plainTextForKhayaSpeech,
  readKhayaTtsJsonErrorIfPresent,
} from "@/app/lib/copilot/khaya";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_TTS_CHARS = 4000;

const LOG = "[Zuri TTS proxy]";

function hexPreview(u8: Uint8Array, maxBytes = 32): string {
  const n = Math.min(u8.length, maxBytes);
  const parts: string[] = [];
  for (let i = 0; i < n; i++) {
    parts.push(u8[i]!.toString(16).padStart(2, "0"));
  }
  return (
    parts.join(" ") + (u8.length > maxBytes ? ` … (+${u8.length - maxBytes} bytes)` : "")
  );
}

export async function POST(req: Request) {
  try {
    const auth = await requireUserAuth(req);
    if (auth instanceof NextResponse) return auth;
    const { payload } = auth;
    const planDenied = await copilotAccessDeniedResponse(payload.bid);
    if (planDenied) return planDenied;

    if (await isCopilotRateLimited(payload.sub)) {
      return new Response(
        JSON.stringify({ error: "Zuri rate limit exceeded. Try again tomorrow." }),
        { status: 429, headers: { "Content-Type": "application/json" } },
      );
    }

    const apiKey = getKhayaApiKey();
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: "Khaya speech output is not configured (missing KHAYA_API_KEY).",
        }),
        { status: 503, headers: { "Content-Type": "application/json" } },
      );
    }

    const body = (await req.json()) as {
      text?: unknown;
      language?: unknown;
      /** If false, do not run en→tw before TTS (input is already Twi). Default: translate when language is tw. */
      translateFromEnglish?: unknown;
    };
    const text =
      typeof body.text === "string" ? body.text.trim() : "";
    const language =
      typeof body.language === "string" ? body.language.trim() : "";
    const translateFromEnglish =
      body.translateFromEnglish === false ? false : true;

    if (!text || !language) {
      return new Response(JSON.stringify({ error: "text and language required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (text.length > MAX_TTS_CHARS) {
      return new Response(JSON.stringify({ error: "text too long" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (!isKhayaTtsLanguage(language)) {
      return new Response(JSON.stringify({ error: "Unsupported language" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const base = getKhayaBaseUrl();
    const tts = khayaTtsUrl(base);

    let textForTts = expandGhanaCedisForTts(plainTextForKhayaSpeech(text));
    if (textForTts.length > MAX_TTS_CHARS) {
      textForTts = textForTts.slice(0, MAX_TTS_CHARS);
    }

    const translatePair =
      translateFromEnglish ? englishToKhayaTranslationPair(language) : null;
    if (translatePair && textForTts.length > 0) {
      try {
        const translated = await khayaTranslate(textForTts, translatePair, {
          apiKey,
          baseUrl: base,
        });
        if (translated.trim()) {
          textForTts = translated.trim();
        }
      } catch (e) {
        console.error("Khaya en→local before TTS", e);
        return new Response(
          JSON.stringify({
            error:
              "Could not prepare audio (translation failed). Try again, or type in the chosen language.",
          }),
          { status: 502, headers: { "Content-Type": "application/json" } },
        );
      }
    }

    if (textForTts.length > MAX_TTS_CHARS) {
      textForTts = textForTts.slice(0, MAX_TTS_CHARS);
    }

    // Again after translate in case output still contains GHS / GH₵.
    textForTts = expandGhanaCedisForTts(textForTts);

    const upstream = await fetch(tts, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": apiKey,
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
      },
      body: JSON.stringify({ text: textForTts, language }),
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      console.error("Khaya TTS error", upstream.status, errText.slice(0, 500));
      return new Response(
        JSON.stringify({
          error: "Text-to-speech failed",
          detail: errText.slice(0, 200),
        }),
        { status: 502, headers: { "Content-Type": "application/json" } },
      );
    }

    const audioBuf = await upstream.arrayBuffer();
    const upstreamCt = upstream.headers.get("content-type") ?? "";
    const ctLower = upstreamCt.toLowerCase();

    let jsonErr = readKhayaTtsJsonErrorIfPresent(audioBuf);
    const looksJsonMime =
      ctLower.includes("application/json") || ctLower.includes("+json");
    if (!jsonErr && (looksJsonMime || khayaBodyLooksLikeJsonObject(audioBuf))) {
      const raw = new TextDecoder("utf-8", { fatal: false }).decode(audioBuf);
      const trimmed = raw.replace(/^\uFEFF/, "").trim();
      jsonErr = `Khaya returned JSON instead of audio (${audioBuf.byteLength} B): ${trimmed.slice(0, 400)}`;
    }
    if (jsonErr) {
      const raw = new TextDecoder("utf-8", { fatal: false }).decode(audioBuf);
      const userMsg = formatKhayaTtsUserFacingMessage(jsonErr);
      console.warn(LOG, "Khaya TTS JSON error (not audio)", {
        language,
        technical: jsonErr,
        userMessage: userMsg,
        raw: raw.slice(0, 800),
      });
      return new Response(
        JSON.stringify({
          error: userMsg,
          detail: raw.slice(0, 500),
          technical: jsonErr,
        }),
        { status: 502, headers: { "Content-Type": "application/json" } },
      );
    }

    const u8 = new Uint8Array(audioBuf);
    const contentType = normalizeKhayaAudioContentType(upstreamCt, u8);

    console.info(LOG, "Khaya TTS upstream ok", {
      language,
      byteLength: audioBuf.byteLength,
      upstreamContentType: upstreamCt,
      normalizedOutgoingContentType: contentType,
      headHex: hexPreview(u8),
    });

    return new Response(Buffer.from(audioBuf), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("POST /api/copilot/tts", e);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
