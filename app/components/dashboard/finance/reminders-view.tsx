"use client";

import useSWR from "swr";
import { useState } from "react";
import { Bell, Check, Loader2, Trash2, Plus } from "lucide-react";
import { ProductsPageShell } from "../products/products-page-shell";
import { toast } from "sonner";

const fetcher = (u: string) =>
    fetch(u).then((r) => {
        if (!r.ok) throw new Error("failed");
        return r.json();
    });

export function RemindersView() {
    const { data, isLoading, mutate } = useSWR("/api/reminders", fetcher);
    const [title, setTitle] = useState("");
    const [notes, setNotes] = useState("");
    const [remindAt, setRemindAt] = useState(() => {
        const d = new Date();
        d.setHours(9, 0, 0, 0);
        d.setDate(d.getDate() + 1);
        return d.toISOString().slice(0, 16);
    });
    const [saving, setSaving] = useState(false);

    async function addReminder(e: React.FormEvent) {
        e.preventDefault();
        if (!title.trim()) {
            toast.error("Title is required");
            return;
        }
        setSaving(true);
        try {
            const res = await fetch("/api/reminders", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: title.trim(),
                    notes: notes.trim() || null,
                    remindAt: new Date(remindAt).toISOString(),
                }),
            });
            if (!res.ok) throw new Error("failed");
            toast.success("Reminder saved");
            setTitle("");
            setNotes("");
            await mutate();
        } catch {
            toast.error("Could not save reminder");
        } finally {
            setSaving(false);
        }
    }

    async function toggleDone(id: string, done: boolean) {
        const res = await fetch(`/api/reminders/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ completed: done }),
        });
        if (!res.ok) {
            toast.error("Update failed");
            return;
        }
        await mutate();
    }

    async function remove(id: string) {
        if (!window.confirm("Delete this reminder?")) return;
        const res = await fetch(`/api/reminders/${id}`, { method: "DELETE" });
        if (!res.ok) {
            toast.error("Delete failed");
            return;
        }
        await mutate();
    }

    const list = Array.isArray(data) ? data : [];

    return (
        <ProductsPageShell
            title="Reminders"
            description="Delivery dates, supplier follow-ups, payroll, or any task you want to track."
            actions={null}
        >
            <div className="grid gap-8 lg:grid-cols-2">
                <form
                    onSubmit={addReminder}
                    className="space-y-4 rounded-2xl border border-[#eef0f2] p-5 dark:border-white/[0.08]"
                >
                    <h2 className="flex items-center gap-2 text-[15px] font-semibold">
                        <Plus className="size-4" />
                        New reminder
                    </h2>
                    <div>
                        <label className="mb-1 block text-[13px] font-medium">Title</label>
                        <input
                            required
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full rounded-xl border px-3 py-2 dark:border-white/[0.12] dark:bg-[#111]"
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-[13px] font-medium">Notes (optional)</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={2}
                            className="w-full rounded-xl border px-3 py-2 dark:border-white/[0.12] dark:bg-[#111]"
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-[13px] font-medium">Remind me at</label>
                        <input
                            type="datetime-local"
                            value={remindAt}
                            onChange={(e) => setRemindAt(e.target.value)}
                            className="w-full rounded-xl border px-3 py-2 dark:border-white/[0.12] dark:bg-[#111]"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={saving}
                        className="w-full rounded-xl bg-[#006c49] py-3 font-semibold text-white disabled:opacity-50 dark:bg-[#6ffbbe] dark:text-[#003523]"
                    >
                        {saving ? <Loader2 className="mx-auto size-5 animate-spin" /> : "Save reminder"}
                    </button>
                </form>

                <div>
                    <h2 className="mb-3 flex items-center gap-2 text-[15px] font-semibold">
                        <Bell className="size-4" />
                        Upcoming &amp; recent
                    </h2>
                    {isLoading ? (
                        <Loader2 className="size-8 animate-spin text-muted-foreground" />
                    ) : list.length === 0 ? (
                        <p className="text-[14px] text-muted-foreground">No reminders yet.</p>
                    ) : (
                        <ul className="space-y-3">
                            {list.map((r: any) => {
                                const done = Boolean(r.completedAt);
                                return (
                                    <li
                                        key={r.id}
                                        className={`rounded-xl border p-4 text-[14px] dark:border-white/[0.08] ${done ? "opacity-60" : ""}`}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <p className="font-semibold">{r.title}</p>
                                                <p className="text-[12px] text-muted-foreground">
                                                    {new Date(r.remindAt).toLocaleString()}
                                                </p>
                                                {r.notes ? (
                                                    <p className="mt-2 text-[13px] text-muted-foreground">{r.notes}</p>
                                                ) : null}
                                            </div>
                                            <div className="flex shrink-0 gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => toggleDone(r.id, !done)}
                                                    className="rounded-lg border p-2 hover:bg-muted/50"
                                                    title={done ? "Mark incomplete" : "Mark done"}
                                                >
                                                    <Check className={`size-4 ${done ? "text-[#006c49] dark:text-[#6ffbbe]" : ""}`} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => remove(r.id)}
                                                    className="rounded-lg border p-2 hover:bg-destructive/10"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="size-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            </div>
        </ProductsPageShell>
    );
}
