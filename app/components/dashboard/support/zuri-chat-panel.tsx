"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, Loader2, Send, Sparkles, Square } from "lucide-react";
import type { UIMessage, TextUIPart } from "ai";
import { HelpMarkdown } from "@/app/help/help-markdown";
import { Button } from "@/components/ui/button";

function isTextPart(p: UIMessage["parts"][number]): p is TextUIPart {
    return p.type === "text";
}

function textFromUIMessageParts(message: UIMessage): string {
    return message.parts.filter(isTextPart).map((p) => p.text).join("");
}

export function ZuriChatPanel() {
    const transport = useMemo(
        () =>
            new DefaultChatTransport({
                api: "/api/support/zuri/chat",
                credentials: "include",
            }),
        [],
    );

    const { messages, sendMessage, status, error, stop, clearError } = useChat({
        transport,
    });

    const [input, setInput] = useState("");
    const [open, setOpen] = useState(true);

    const busy = status === "submitted" || status === "streaming";

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const q = input.trim();
        if (!q || busy) return;
        clearError();
        setInput("");
        await sendMessage({ text: q });
    };

    return (
        <section
            className="rounded-[2rem] border border-[#eef0f2] bg-white shadow-sm dark:border-white/[0.08] dark:bg-[#111]"
            aria-label="Zuri help assistant"
        >
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className="flex w-full items-center justify-between gap-3 rounded-[2rem] px-6 py-5 text-left transition-colors hover:bg-muted/30"
            >
                <div className="flex items-center gap-3">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#006c49]/10 text-[#006c49] dark:bg-[#6ffbbe]/10 dark:text-[#6ffbbe]">
                        <Sparkles className="size-5" aria-hidden />
                    </span>
                    <div>
                        <p className="text-[16px] font-bold tracking-tight text-foreground">Ask Zuri</p>
                        <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">
                            Talk it through safely from our docs — Zuri doesn&apos;t see your till or database. Wrong total,
                            glitch, billing? We&apos;ll nudge you to {" "}
                            <Link href="/contact" className="font-semibold text-[#006c49] underline-offset-4 hover:underline dark:text-[#6ffbbe]">
                                Contact
                            </Link>{" "}
                            if we can&apos;t nail it here.
                        </p>
                    </div>
                </div>
                {open ? (
                    <ChevronUp className="size-5 shrink-0 text-muted-foreground" aria-hidden />
                ) : (
                    <ChevronDown className="size-5 shrink-0 text-muted-foreground" aria-hidden />
                )}
            </button>

            {open ? (
                <div className="border-t border-border/60 px-4 pb-5 pt-2 sm:px-6">
                    {error ? (
                        <div
                            className="mb-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-[13px] text-destructive"
                            role="alert"
                        >
                            {error.message === "Failed to fetch" ? (
                                <span>Could not reach Zuri. Check your connection and try again.</span>
                            ) : (
                                <span>{error.message}</span>
                            )}{" "}
                            <Link
                                href="/help"
                                className="font-medium underline underline-offset-2"
                                target="_blank"
                                rel="noreferrer"
                            >
                                Open Help Centre
                            </Link>
                        </div>
                    ) : null}

                    <div className="mb-3 max-h-[min(22rem,50vh)] space-y-3 overflow-y-auto rounded-xl border border-border/60 bg-muted/20 p-3 dark:bg-black/20">
                        {messages.length === 0 ? (
                            <p className="px-1 py-6 text-center text-[14px] text-muted-foreground">
                                Example: &ldquo;My cash drawer doesn&apos;t match yesterday — what should I check?&rdquo;
                            </p>
                        ) : (
                            messages.map((m) => {
                                const text = textFromUIMessageParts(m);
                                if (!text.trim() && m.role === "assistant") return null;
                                const isUser = m.role === "user";
                                return (
                                    <div
                                        key={m.id}
                                        className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                                    >
                                        <div
                                            className={`max-w-[92%] rounded-2xl px-4 py-3 text-[14px] leading-relaxed ${
                                                isUser
                                                    ? "bg-[#006c49] text-white dark:bg-[#014d3a]"
                                                    : "border border-border/70 bg-card text-foreground"
                                            }`}
                                        >
                                            {isUser ? (
                                                <p className="whitespace-pre-wrap">{text}</p>
                                            ) : (
                                                <HelpMarkdown content={text} />
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                        {busy ? (
                            <div className="flex items-center gap-2 px-2 text-[13px] text-muted-foreground">
                                <Loader2 className="size-4 animate-spin" aria-hidden />
                                Zuri is thinking…
                            </div>
                        ) : null}
                    </div>

                    <form onSubmit={onSubmit} className="flex gap-2">
                        <label className="sr-only" htmlFor="zuri-input">
                            Message Zuri
                        </label>
                        <input
                            id="zuri-input"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask in your own words…"
                            disabled={busy}
                            className="h-12 min-w-0 flex-1 rounded-xl border border-border bg-background px-4 text-[15px] outline-none ring-[#006c49]/15 focus:border-[#006c49]/35 focus:ring-2 dark:border-white/[0.08] dark:bg-[#0a0a0a]"
                            autoComplete="off"
                        />
                        {busy ? (
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="size-12 shrink-0 rounded-xl"
                                onClick={() => void stop()}
                                aria-label="Stop"
                            >
                                <Square className="size-4 fill-current" />
                            </Button>
                        ) : null}
                        <Button
                            type="submit"
                            disabled={busy || !input.trim()}
                            className="size-12 shrink-0 rounded-xl bg-[#006c49] hover:bg-[#006c49]/90 dark:bg-[#6ffbbe] dark:text-black dark:hover:bg-[#6ffbbe]/90"
                            size="icon"
                            aria-label="Send message"
                        >
                            <Send className="size-5" />
                        </Button>
                    </form>
                    <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">
                        Prefer browsing? Same guides on{" "}
                        <Link
                            href="/help"
                            className="font-medium text-[#006c49] underline-offset-4 hover:underline dark:text-[#6ffbbe]"
                            target="_blank"
                            rel="noreferrer"
                        >
                            Help Centre
                        </Link>
                        . Still stuck —{" "}
                        <Link
                            href="/contact"
                            className="font-semibold text-[#006c49] underline-offset-4 hover:underline dark:text-[#6ffbbe]"
                            target="_blank"
                            rel="noreferrer"
                        >
                            Contact support
                        </Link>
                        .
                    </p>
                </div>
            ) : null}
        </section>
    );
}
