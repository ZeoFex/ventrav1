"use client";

import { useCallback, useRef, useState } from "react";

export type KhayaSpeechState =
  | { status: "idle" }
  | { status: "recording" }
  | { status: "uploading" };

function pickMimeType(): string {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
  ];
  for (const c of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c)) {
      return c;
    }
  }
  return "";
}

/** Flush any buffered audio before stop so the final blob is not empty (Chromium). */
function requestRecorderDataThenStop(rec: MediaRecorder): void {
  try {
    if (rec.state === "recording") {
      rec.requestData();
    }
  } catch {
    /* noop */
  }
  try {
    if (rec.state !== "inactive") {
      rec.stop();
    }
  } catch {
    /* noop */
  }
}

const TRANSCRIBE_FETCH_MS = 75_000;

/**
 * Record microphone audio and send it to Khaya ASR via our server proxy.
 * Use for Twi (and other Khaya ASR languages) where browser SpeechRecognition is inadequate.
 */
export function useCopilotKhayaSpeech(options: {
  language?: string;
  onFinal: (text: string) => void;
  onError?: (message: string) => void;
}) {
  const { language = "tw", onFinal, onError } = options;
  const [state, setState] = useState<KhayaSpeechState>({ status: "idle" });
  const mediaRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const cleanupStream = useCallback(() => {
    const s = mediaRef.current;
    if (s) {
      for (const t of s.getTracks()) t.stop();
    }
    mediaRef.current = null;
  }, []);

  /**
   * End recording if active. Does not stop the mic until `MediaRecorder` fires
   * `stop` — stopping tracks synchronously after `rec.stop()` breaks final chunks in Chromium.
   */
  const stop = useCallback(() => {
    const r = recorderRef.current;
    if (r && r.state !== "inactive") {
      requestRecorderDataThenStop(r);
      return;
    }
    recorderRef.current = null;
    cleanupStream();
    setState((s) => (s.status === "uploading" ? s : { status: "idle" }));
  }, [cleanupStream]);

  const start = useCallback(async () => {
    if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      onError?.("Microphone is not available in this browser.");
      return;
    }
    if (typeof MediaRecorder === "undefined") {
      onError?.("Recording is not supported in this browser.");
      return;
    }

    chunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRef.current = stream;
      const mime = pickMimeType();
      const rec = mime
        ? new MediaRecorder(stream, { mimeType: mime })
        : new MediaRecorder(stream);
      recorderRef.current = rec;

      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      rec.onerror = () => {
        onError?.("Recording failed.");
        stop();
      };

      rec.onstop = () => {
        recorderRef.current = null;
        const blob = new Blob(chunksRef.current, {
          type: rec.mimeType || "audio/webm",
        });
        chunksRef.current = [];
        cleanupStream();

        if (blob.size === 0) {
          setState({ status: "idle" });
          onError?.("No audio captured.");
          return;
        }

        void (async () => {
          setState({ status: "uploading" });
          const controller = new AbortController();
          const tid = window.setTimeout(
            () => controller.abort(),
            TRANSCRIBE_FETCH_MS,
          );
          try {
            const res = await fetch(
              `/api/copilot/transcribe?language=${encodeURIComponent(language)}`,
              {
                method: "POST",
                headers: {
                  "Content-Type": blob.type || "application/octet-stream",
                },
                body: blob,
                signal: controller.signal,
              },
            );
            const data = (await res.json().catch(() => ({}))) as {
              error?: string;
              text?: string;
            };
            if (!res.ok) {
              throw new Error(data.error || `Request failed (${res.status})`);
            }
            const text = typeof data.text === "string" ? data.text.trim() : "";
            if (text) {
              onFinal(text);
            } else {
              onError?.("Could not understand the audio. Try again.");
            }
          } catch (e) {
            const aborted =
              e instanceof Error && e.name === "AbortError";
            onError?.(
              aborted
                ? "Transcription took too long. Check your connection or try again."
                : e instanceof Error
                  ? e.message
                  : "Transcription failed",
            );
          } finally {
            clearTimeout(tid);
            setState({ status: "idle" });
          }
        })();
      };

      rec.start(250);
      setState({ status: "recording" });
    } catch {
      cleanupStream();
      onError?.("Microphone permission denied or unavailable.");
      setState({ status: "idle" });
    }
  }, [cleanupStream, language, onError, onFinal, stop]);

  const toggle = useCallback(() => {
    if (state.status === "recording") {
      const r = recorderRef.current;
      if (r && r.state !== "inactive") {
        requestRecorderDataThenStop(r);
      } else {
        stop();
      }
    } else if (state.status === "idle") {
      void start();
    }
  }, [state.status, start, stop]);

  return {
    state,
    toggle,
    stop,
    start,
  };
}
