import { cookies } from "next/headers";
import { verifyAccessToken } from "@/server/auth/token-service";
import { COOKIE_NAMES } from "@/server/config/auth-config";
import { isCopilotRateLimited } from "@/app/lib/copilot/rate-limit";
import {
  getKhayaApiKey,
  getKhayaBaseUrl,
  isKhayaAsrLanguage,
  khayaAsrUrl,
  parseKhayaAsrJson,
} from "@/app/lib/copilot/khaya";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_AUDIO_BYTES = 8 * 1024 * 1024;

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAMES.ACCESS)?.value;
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const payload = await verifyAccessToken(token);
    if (await isCopilotRateLimited(payload.sub)) {
      return new Response(
        JSON.stringify({ error: "Copilot rate limit exceeded. Try again tomorrow." }),
        { status: 429, headers: { "Content-Type": "application/json" } },
      );
    }

    const apiKey = getKhayaApiKey();
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: "Twi voice input is not configured (missing KHAYA_API_KEY).",
        }),
        { status: 503, headers: { "Content-Type": "application/json" } },
      );
    }

    const url = new URL(req.url);
    const langParam = url.searchParams.get("language")?.trim() || "tw";
    if (!isKhayaAsrLanguage(langParam)) {
      return new Response(JSON.stringify({ error: "Unsupported language" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const len = req.headers.get("content-length");
    if (len && Number(len) > MAX_AUDIO_BYTES) {
      return new Response(JSON.stringify({ error: "Audio too large" }), {
        status: 413,
        headers: { "Content-Type": "application/json" },
      });
    }

    const buf = Buffer.from(await req.arrayBuffer());
    if (buf.length > MAX_AUDIO_BYTES) {
      return new Response(JSON.stringify({ error: "Audio too large" }), {
        status: 413,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (buf.length === 0) {
      return new Response(JSON.stringify({ error: "Empty body" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const base = getKhayaBaseUrl();
    const asr = khayaAsrUrl(base);
    const upstreamContentType =
      req.headers.get("content-type")?.trim() || "application/octet-stream";

    const upstreamUrl = `${asr}?language=${encodeURIComponent(langParam)}`;
    let upstream: Response;
    try {
      upstream = await fetch(upstreamUrl, {
        method: "POST",
        headers: {
          "Ocp-Apim-Subscription-Key": apiKey,
          "Content-Type": upstreamContentType,
          "Cache-Control": "no-cache",
        },
        body: buf,
        signal: AbortSignal.timeout(50_000),
      });
    } catch (e: unknown) {
      const nm =
        e && typeof e === "object" && "name" in e
          ? String((e as { name: unknown }).name)
          : "";
      if (nm === "TimeoutError" || nm === "AbortError") {
        console.error("Khaya ASR upstream timeout", upstreamUrl);
        return new Response(
          JSON.stringify({
            error: "Speech recognition timed out. Try a shorter clip or check your connection.",
          }),
          { status: 504, headers: { "Content-Type": "application/json" } },
        );
      }
      throw e;
    }

    const rawText = await upstream.text();
    if (!upstream.ok) {
      console.error("Khaya ASR error", upstream.status, rawText.slice(0, 500));
      return new Response(
        JSON.stringify({
          error: "Speech recognition failed",
          detail: rawText.slice(0, 200),
        }),
        { status: 502, headers: { "Content-Type": "application/json" } },
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawText) as unknown;
    } catch {
      parsed = rawText;
    }
    const text = parseKhayaAsrJson(parsed);

    return new Response(JSON.stringify({ text, language: langParam }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("POST /api/copilot/transcribe", e);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
