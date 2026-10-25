"use client";

import { FormEvent, useState } from "react";

export type ChatMessage = {
  id: string;
  sender: string;
  senderName: string;
  body: string;
  createdAt: string;
};

export function OrderChat({
  messages,
  mine,
  onSend,
  busy,
}: {
  messages: ChatMessage[];
  mine: "shop" | "customer";
  onSend: (body: string) => Promise<void>;
  busy: boolean;
}) {
  const [draft, setDraft] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || busy) return;
    await onSend(body);
    setDraft("");
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-3 sm:px-4">
        {messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-[#8a8478]">No messages yet.</p>
        ) : (
          messages.map((message) => {
            const own = message.sender === mine;
            return (
              <div key={message.id} className={`flex ${own ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                    own
                      ? "bg-[#1f3d32] text-white"
                      : "bg-[#efe8dc] text-[#1c1917] dark:bg-white/10 dark:text-zinc-100"
                  }`}
                >
                  <p className={`mb-0.5 text-[10px] font-semibold ${own ? "text-white/70" : "text-[#6b8f7c]"}`}>
                    {message.senderName}
                  </p>
                  <p className="whitespace-pre-wrap break-words">{message.body}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
      <form onSubmit={submit} className="flex gap-2 border-t border-[#e7e0d4] p-3 dark:border-white/10">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Write a message"
          className="min-w-0 flex-1 rounded-full border border-[#e7e0d4] bg-transparent px-4 py-2.5 text-base outline-none focus:border-[#1f3d32] dark:border-white/10 sm:text-sm"
        />
        <button
          type="submit"
          disabled={busy || !draft.trim()}
          className="shrink-0 rounded-full bg-[#1f3d32] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40 dark:bg-[#6ffbbe] dark:text-[#003527]"
        >
          Send
        </button>
      </form>
    </div>
  );
}
