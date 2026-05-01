"use client";

import { useEffect, useRef, type KeyboardEvent } from "react";
import type { CopilotPreferredLanguage } from "@/app/lib/copilot/prompts/system";
import { Mic, Send, Square } from "lucide-react";
import { toast } from "sonner";
import { useCopilotKhayaSpeech } from "../hooks/use-copilot-khaya-speech";
import {
  speechRecognitionAvailable,
  useCopilotSpeech,
} from "../hooks/use-copilot-speech";
import { cn } from "@/lib/utils";

const KHAYA_MODE_LABEL: Record<Exclude<CopilotPreferredLanguage, "en">, string> = {
  tw: "Twi",
  gaa: "Ga",
  ee: "Ewe",
};

export function CopilotComposer({
  value,
  onChange,
  onSubmit,
  onVoiceSubmit,
  disabled,
  speechMode = "en",
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  /** If set, successful voice capture sends this message (and typically clears the draft). */
  onVoiceSubmit?: (text: string) => void;
  disabled?: boolean;
  /** English: Web Speech API. Twi / Ga / Ewe: Khaya ASR (needs KHAYA_API_KEY). */
  speechMode?: CopilotPreferredLanguage;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const khayaAsrLang =
    speechMode === "en" ? "tw" : speechMode;

  const browserSpeech = useCopilotSpeech({
    lang: "en-GH",
    onInterim: onChange,
    onFinal: (text) => {
      onChange(text);
      if (text.trim() && onVoiceSubmit) {
        onVoiceSubmit(text.trim());
      }
    },
    onError: (msg) => toast.error(msg),
  });

  const khayaSpeech = useCopilotKhayaSpeech({
    language: khayaAsrLang,
    onFinal: (text) => {
      onChange(text);
      if (text.trim() && onVoiceSubmit) {
        onVoiceSubmit(text.trim());
      }
    },
    onError: (msg) => toast.error(msg),
  });

  const useKhaya = speechMode !== "en";

  const listening = useKhaya
    ? khayaSpeech.state.status === "recording" ||
      khayaSpeech.state.status === "uploading"
    : browserSpeech.state.status === "listening";

  const uploading = useKhaya && khayaSpeech.state.status === "uploading";

  const khayaLabel = useKhaya ? KHAYA_MODE_LABEL[speechMode] : "";

  useEffect(() => {
    browserSpeech.stop();
    khayaSpeech.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: run on speechMode only
  }, [speechMode]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [value]);

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && value.trim()) {
        if (listening) {
          if (useKhaya) khayaSpeech.stop();
          else browserSpeech.stop();
        }
        onSubmit();
      }
    }
  };

  const onMicClick = () => {
    if (disabled) return;
    if (useKhaya) {
      if (typeof MediaRecorder === "undefined") {
        toast.message("Voice input needs a modern browser", {
          description: "Try Chrome or Edge, or type your question.",
        });
        return;
      }
      if (listening) {
        khayaSpeech.toggle();
        return;
      }
      onChange("");
      void khayaSpeech.start();
      return;
    }
    if (!speechRecognitionAvailable()) {
      toast.message("Voice input needs Chrome or Edge on desktop", {
        description: "Safari support is limited; you can still type your question.",
      });
      return;
    }
    if (listening) {
      browserSpeech.stop();
      return;
    }
    onChange("");
    browserSpeech.start();
  };

  return (
    <div className="flex items-end gap-2 border-t border-[#bfc9c3]/15 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] dark:border-white/[0.08]">
      <div className="relative shrink-0">
        {listening ? (
          <span
            className="pointer-events-none absolute inset-0 motion-safe:animate-ping rounded-xl bg-[#006c49]/25 dark:bg-[#6ffbbe]/20"
            aria-hidden
          />
        ) : null}
        <button
          type="button"
          onClick={onMicClick}
          disabled={disabled}
          aria-pressed={listening}
          aria-label={listening ? "Stop recording" : "Speak your question"}
          title={
            useKhaya
              ? listening
                ? uploading
                  ? "Sending audio…"
                  : "Tap to stop"
                : `Speak in ${khayaLabel} (Khaya)`
              : !speechRecognitionAvailable()
                ? "Voice input unavailable in this browser"
                : listening
                  ? "Tap to stop"
                  : "Speak your question"
          }
          className={cn(
            "tap-target relative flex size-11 items-center justify-center rounded-xl border shadow-sm transition-all disabled:pointer-events-none disabled:opacity-40",
            listening
              ? "border-[#006c49]/50 bg-[#006c49]/12 text-[#006c49] dark:border-[#6ffbbe]/40 dark:bg-[#6ffbbe]/12 dark:text-[#6ffbbe]"
              : "border-[#bfc9c3]/25 bg-surface-elevated text-muted-foreground hover:border-[#006c49]/35 hover:text-[#006c49] dark:border-white/[0.1] dark:hover:border-[#6ffbbe]/35 dark:hover:text-[#6ffbbe]",
          )}
        >
          {listening ? (
            <Square className="size-4 fill-current" aria-hidden />
          ) : (
            <Mic className="size-5" strokeWidth={2} aria-hidden />
          )}
        </button>
      </div>
      <div className="relative min-w-0 flex-1">
        {listening ? (
          <div className="pointer-events-none absolute -top-6 left-0 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-[#006c49] dark:text-[#6ffbbe]">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full motion-safe:animate-ping rounded-full bg-[#006c49] opacity-60 dark:bg-[#6ffbbe]" />
              <span className="relative inline-flex size-2 rounded-full bg-[#006c49] dark:bg-[#6ffbbe]" />
            </span>
            {uploading
              ? "Sending…"
              : useKhaya
                ? `${khayaLabel} — recording…`
                : "Listening…"}
          </div>
        ) : null}
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={
            listening
              ? uploading
                ? "Transcribing your voice…"
                : useKhaya
                  ? `Speak ${khayaLabel} — tap stop when finished`
                  : "Speak now — text appears as you talk"
              : "Type or tap the mic to speak…"
          }
          disabled={disabled || listening}
          rows={1}
          className="max-h-40 min-h-[44px] w-full resize-none rounded-xl border border-[#bfc9c3]/20 bg-background px-3 py-2.5 text-[15px] outline-none ring-[#006c49]/30 placeholder:text-muted-foreground focus-visible:ring-2 disabled:opacity-60 dark:border-white/[0.1]"
          aria-label="Message Zuri"
        />
      </div>
      <button
        type="button"
        onClick={() => {
          if (listening) {
            if (useKhaya) khayaSpeech.stop();
            else browserSpeech.stop();
          }
          onSubmit();
        }}
        disabled={disabled || !value.trim() || listening}
        className="tap-target flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#006c49] text-white shadow-sm transition-colors hover:bg-[#003527] disabled:opacity-40 dark:bg-[#6ffbbe] dark:text-[#0a0a0a] dark:hover:bg-white"
        aria-label="Send message"
      >
        <Send className="size-5" />
      </button>
    </div>
  );
}
