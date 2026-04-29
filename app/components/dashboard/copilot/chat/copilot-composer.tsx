"use client";

import {
  useEffect,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
} from "react";
import type { CopilotPreferredLanguage } from "@/app/lib/copilot/prompts/system";
import { Mic, Plus, Send, Square } from "lucide-react";
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

const cardStyle =
  "border border-black/[0.04] bg-[#fafafa] shadow-[0_4px_15px_rgba(0,0,0,0.06)] dark:border-white/[0.06] dark:bg-[#1a1a1c] dark:shadow-[0_4px_24px_rgba(0,0,0,0.45)]";

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
  const shellRef = useRef<HTMLDivElement>(null);
  const [focusWithin, setFocusWithin] = useState(false);
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

  const hasDraft = value.trim().length > 0;
  const expanded = focusWithin || hasDraft || listening;

  const onShellBlurCapture = (e: FocusEvent<HTMLDivElement>) => {
    const next = e.relatedTarget as Node | null;
    if (next && shellRef.current?.contains(next)) return;
    queueMicrotask(() => {
      if (!shellRef.current?.contains(document.activeElement)) {
        setFocusWithin(false);
      }
    });
  };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!expanded) {
      el.style.height = "";
      return;
    }
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value, expanded]);

  const micBtn = (
    <div className="relative shrink-0">
      {listening ? (
        <span
          className="pointer-events-none absolute inset-0 motion-safe:animate-ping rounded-full bg-[#006c49]/25 dark:bg-[#6ffbbe]/20"
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
          "tap-target relative flex size-10 shrink-0 items-center justify-center rounded-full transition-all disabled:pointer-events-none disabled:opacity-40",
          listening
            ? "bg-[#006c49]/15 text-[#006c49] dark:bg-[#6ffbbe]/15 dark:text-[#6ffbbe]"
            : "bg-black/[0.07] text-muted-foreground hover:bg-black/[0.1] hover:text-[#006c49] dark:bg-white/[0.1] dark:hover:bg-white/[0.14] dark:hover:text-[#6ffbbe]",
        )}
      >
        {listening ? (
          <Square className="size-4 fill-current" aria-hidden />
        ) : (
          <Mic className="size-[18px]" strokeWidth={2} aria-hidden />
        )}
      </button>
    </div>
  );

  const sendBtn = (
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
      className={cn(
        "tap-target flex size-10 shrink-0 items-center justify-center rounded-full transition-colors",
        disabled || !value.trim() || listening
          ? "bg-black/[0.07] text-muted-foreground opacity-70 dark:bg-white/[0.1]"
          : "bg-[#006c49] text-white shadow-sm hover:bg-[#003527] dark:bg-[#6ffbbe] dark:text-[#0a0a0a] dark:hover:bg-white",
      )}
      aria-label="Send message"
      title={!value.trim() ? "Enter a message to send" : undefined}
    >
      <Send className="size-[18px]" />
    </button>
  );

  const placeholder =
    listening
      ? uploading
        ? "Transcribing your voice…"
        : useKhaya
          ? `Speak ${khayaLabel} — tap stop when finished`
          : "Speak now — text appears as you talk"
      : expanded
        ? "Ask Zuri anything"
        : "Ask Zuri anything…";

  const textareaClass = cn(
    "box-border w-full resize-none bg-transparent border-0 text-[15px] outline-none placeholder:text-muted-foreground/85 focus-visible:ring-0 disabled:opacity-60 dark:placeholder:text-muted-foreground/70",
    expanded
      ? "min-h-[2.75rem] overflow-hidden px-0 py-0 leading-snug"
      : "h-11 min-h-[2.75rem] max-h-[2.75rem] overflow-hidden px-2 py-0 leading-snug",
  );

  return (
    <div
      ref={shellRef}
      onFocusCapture={() => setFocusWithin(true)}
      onBlurCapture={onShellBlurCapture}
      className="relative bg-[#f2f2f7] px-3 pb-0 pt-2 dark:bg-[#0c0c0e] sm:px-4"
    >
      {listening && !expanded ? (
        <div className="mb-2 flex items-center gap-1.5 px-2 text-[11px] font-medium uppercase tracking-wide text-[#006c49] dark:text-[#6ffbbe]">
          <span className="relative flex size-2 shrink-0">
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
      <div
        className={cn(
          "flex gap-2 transition-[border-radius] duration-200 ease-out",
          expanded
            ? "flex-col overflow-hidden rounded-[28px]"
            : "flex-row items-end overflow-hidden rounded-full px-2 py-1.5",
          cardStyle,
        )}
      >
        {expanded && listening ? (
          <div className="pointer-events-none flex shrink-0 items-center gap-1.5 border-b border-[#bfc9c3]/10 px-4 pb-2 pt-3 text-[11px] font-medium uppercase tracking-wide text-[#006c49] dark:border-white/[0.06] dark:text-[#6ffbbe]">
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
        {!expanded ? micBtn : null}
        <div
          className={cn(
            "min-h-0 min-w-0",
            expanded ? "w-full px-4 pt-2.5" : "min-w-0 flex-1",
          )}
        >
          <textarea
            ref={ref}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            disabled={disabled || listening}
            rows={1}
            className={textareaClass}
            aria-label="Message Copilot"
          />
        </div>
        {!expanded ? sendBtn : null}
        {expanded ? (
          <div className="flex shrink-0 items-center justify-between gap-3 px-3 pb-2 pt-1">
            <button
              type="button"
              onClick={() => ref.current?.focus()}
              disabled={disabled}
              className="tap-target flex size-10 shrink-0 items-center justify-center rounded-full bg-black/[0.07] text-muted-foreground transition-colors hover:bg-black/[0.11] hover:text-foreground disabled:pointer-events-none disabled:opacity-40 dark:bg-white/[0.1] dark:hover:bg-white/[0.14]"
              aria-label="Focus message field"
              title="Focus message field"
            >
              <Plus className="size-[18px]" strokeWidth={2} aria-hidden />
            </button>
            <div className="flex items-center gap-2">
              {micBtn}
              {sendBtn}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
