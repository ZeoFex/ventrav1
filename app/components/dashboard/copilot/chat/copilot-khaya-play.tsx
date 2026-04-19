"use client";

import { useCallback, useRef, useState } from "react";
import { Loader2, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { CopilotPreferredLanguage } from "@/app/lib/copilot/prompts/system";
import { normalizeKhayaAudioContentType } from "@/app/lib/copilot/khaya";

export type KhayaPlayTtsLanguage = Exclude<CopilotPreferredLanguage, "en">;

const LOG = "[Copilot Khaya TTS]";

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

function getAudioContextCtor(): (typeof AudioContext) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    AudioContext?: typeof AudioContext;
    webkitAudioContext?: typeof AudioContext;
  };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

/** When `<audio>` rejects (wrong blob MIME, Ga/MP3 edge cases), decode with Web Audio — works for MP3/WAV in Chromium. */
async function playArrayBufferWithWebAudio(ab: ArrayBuffer): Promise<void> {
  const u8 = new Uint8Array(ab);
  console.info(LOG, "Web Audio fallback", {
    byteLength: ab.byteLength,
    headHex: hexPreview(u8),
  });
  const Ctor = getAudioContextCtor();
  if (!Ctor) {
    console.error(LOG, "Web Audio API not available");
    throw new Error("Web Audio API not available");
  }
  const ctx = new Ctor();
  let decoded: AudioBuffer;
  try {
    decoded = await ctx.decodeAudioData(ab.slice(0));
    console.info(LOG, "decodeAudioData ok", {
      duration: decoded.duration,
      sampleRate: decoded.sampleRate,
      channels: decoded.numberOfChannels,
    });
  } catch (decodeErr) {
    console.error(LOG, "decodeAudioData failed", decodeErr, {
      byteLength: ab.byteLength,
      headHex: hexPreview(u8),
      audioContextState: ctx.state,
    });
    await ctx.close().catch(() => {});
    throw new Error("Could not decode audio data");
  }
  await new Promise<void>((resolve, reject) => {
    const src = ctx.createBufferSource();
    src.buffer = decoded;
    src.connect(ctx.destination);
    src.onended = () => {
      void ctx.close().then(() => resolve()).catch(() => resolve());
    };
    try {
      src.start(0);
      console.info(LOG, "Web Audio playback started");
    } catch (e) {
      console.error(LOG, "BufferSource.start failed", e);
      void ctx.close().catch(() => {});
      reject(e);
    }
  });
}

const TTS_LABEL: Record<KhayaPlayTtsLanguage, string> = {
  tw: "Twi",
  gaa: "Ga",
  ee: "Ewe",
};

/**
 * Play assistant text with Khaya TTS (translate from English if needed, then speak).
 */
export function CopilotKhayaPlay({
  text,
  ttsLanguage,
}: {
  text: string;
  ttsLanguage: KhayaPlayTtsLanguage;
}) {
  const [busy, setBusy] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const play = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    const toastId = toast.loading("Translating and preparing audio…", {
      duration: 120_000,
    });
    let suppressPlayFailedConsole = false;
    try {
      const prev = audioRef.current;
      if (prev) {
        prev.pause();
        URL.revokeObjectURL(prev.src);
        audioRef.current = null;
      }
      const res = await fetch("/api/copilot/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: trimmed,
          language: ttsLanguage,
        }),
      });
      const contentTypeHeader = res.headers.get("Content-Type");
      console.info(LOG, "fetch /api/copilot/tts response", {
        ok: res.ok,
        status: res.status,
        contentType: contentTypeHeader,
        language: ttsLanguage,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const payload = { status: res.status, body: err };
        if (res.status === 502 || res.status === 503 || res.status === 429) {
          console.warn(LOG, "TTS upstream unavailable or rate limited", payload);
          suppressPlayFailedConsole = true;
        } else {
          console.error(LOG, "TTS HTTP error", payload);
        }
        throw new Error(
          typeof err.error === "string" ? err.error : `TTS failed (${res.status})`,
        );
      }
      const ab = await res.arrayBuffer();
      if (ab.byteLength === 0) {
        console.error(LOG, "empty ArrayBuffer from TTS");
        throw new Error("Empty audio response");
      }
      const u8 = new Uint8Array(ab);
      const mime = normalizeKhayaAudioContentType(contentTypeHeader, u8);
      console.info(LOG, "normalized MIME + preview", {
        rawContentType: contentTypeHeader,
        normalizedMime: mime,
        byteLength: ab.byteLength,
        headHex: hexPreview(u8),
      });
      const blob = new Blob([ab], { type: mime });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => {
        URL.revokeObjectURL(url);
        if (audioRef.current === audio) audioRef.current = null;
      };
      toast.dismiss(toastId);

      try {
        await audio.play();
        console.info(LOG, "HTMLAudioElement.play() ok", { mime, blobSize: blob.size });
      } catch (playErr) {
        console.warn(LOG, "HTMLAudioElement.play() failed, trying Web Audio", playErr, {
          errorName: playErr instanceof DOMException ? playErr.name : undefined,
          errorMessage: playErr instanceof Error ? playErr.message : String(playErr),
          mime,
        });
        audio.onended = null;
        URL.revokeObjectURL(url);
        if (audioRef.current === audio) audioRef.current = null;
        await playArrayBufferWithWebAudio(ab);
      }
    } catch (e) {
      if (!suppressPlayFailedConsole) {
        console.error(LOG, "play() failed", e);
      }
      toast.dismiss(toastId);
      toast.error(e instanceof Error ? e.message : "Could not play audio");
    } finally {
      setBusy(false);
    }
  }, [busy, text, ttsLanguage]);

  const langName = TTS_LABEL[ttsLanguage];

  return (
    <button
      type="button"
      onClick={() => void play()}
      disabled={busy || !text.trim()}
      aria-busy={busy}
      aria-label={
        busy
          ? "Translating and preparing audio"
          : `Play reply as ${langName} speech`
      }
      title={busy ? "Translating and preparing audio…" : `Listen (${langName})`}
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-[#bfc9c3]/20 text-muted-foreground transition-colors",
        "hover:border-[#006c49]/40 hover:text-[#006c49] disabled:opacity-40",
        "dark:border-white/[0.08] dark:hover:border-[#6ffbbe]/35 dark:hover:text-[#6ffbbe]",
      )}
    >
      {busy ? (
        <Loader2 className="size-4 motion-safe:animate-spin" aria-hidden />
      ) : (
        <Volume2 className="size-4" aria-hidden />
      )}
    </button>
  );
}
