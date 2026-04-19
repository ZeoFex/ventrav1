"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type CopilotSpeechState =
  | { status: "idle" }
  | { status: "listening" }
  | { status: "unsupported" };

function getSpeechRecognitionCtor(): typeof SpeechRecognition | null {
  if (typeof window === "undefined") return null;
  return (
    window.SpeechRecognition ??
    (window as unknown as { webkitSpeechRecognition?: typeof SpeechRecognition })
      .webkitSpeechRecognition ??
    null
  );
}

export function speechRecognitionAvailable(): boolean {
  return getSpeechRecognitionCtor() !== null;
}

/**
 * Browser speech-to-text (Chrome / Edge; Safari support varies).
 * Continuous listening until stopped or silence, with interim captions.
 */
export function useCopilotSpeech(options: {
  /** BCP 47 tag, e.g. en-GH, en-US */
  lang?: string;
  onInterim: (text: string) => void;
  onFinal: (text: string) => void;
  onError?: (message: string) => void;
}) {
  const { lang = "en-GH", onInterim, onFinal, onError } = options;
  const [state, setState] = useState<CopilotSpeechState>(() =>
    speechRecognitionAvailable() ? { status: "idle" } : { status: "unsupported" },
  );
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const finalBufferRef = useRef("");
  /** Full caption (final + interim) for a reliable flush on stop. */
  const lastCombinedRef = useRef("");

  const stop = useCallback(() => {
    const r = recognitionRef.current;
    if (r) {
      try {
        r.stop();
      } catch {
        /* already stopped */
      }
    }
    recognitionRef.current = null;
    setState((s) => (s.status === "unsupported" ? s : { status: "idle" }));
  }, []);

  const start = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setState({ status: "unsupported" });
      onError?.("Voice input is not supported in this browser.");
      return;
    }

    finalBufferRef.current = "";
    lastCombinedRef.current = "";
    onInterim("");

    const recognition = new Ctor();
    recognition.lang = lang;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const piece = event.results[i]![0]!.transcript;
        if (event.results[i]!.isFinal) {
          finalBufferRef.current = `${finalBufferRef.current}${piece}`.trim();
        } else {
          interim += piece;
        }
      }
      const combined = [finalBufferRef.current, interim].filter(Boolean).join(" ").trim();
      lastCombinedRef.current = combined;
      onInterim(combined);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === "aborted" || event.error === "no-speech") {
        return;
      }
      onError?.(event.message || event.error);
      stop();
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      const text =
        lastCombinedRef.current.trim() || finalBufferRef.current.trim();
      setState((s) => (s.status === "unsupported" ? s : { status: "idle" }));
      if (text) {
        onFinal(text);
      }
      finalBufferRef.current = "";
      lastCombinedRef.current = "";
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setState({ status: "listening" });
    } catch {
      onError?.("Could not start microphone.");
      setState({ status: "idle" });
    }
  }, [lang, onError, onFinal, onInterim, stop]);

  useEffect(() => () => stop(), [stop]);

  const toggle = useCallback(() => {
    if (state.status === "listening") {
      stop();
    } else if (state.status === "idle") {
      start();
    }
  }, [state.status, start, stop]);

  return {
    state,
    toggle,
    stop,
    start,
    supported: state.status !== "unsupported",
  };
}
