"use client";

import { useState } from "react";
import { Plus, Tag, Loader2, X } from "lucide-react";
import { ProductsPageShell } from "./products-page-shell";
import { useTags } from "./products-data-hooks";

export function ProductsTagsView() {
  const { tags = [], isLoading, mutate } = useTags();
  const [open, setOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<any>(null);
  const [deletingTag, setDeletingTag] = useState<any>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState("emerald");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const colors = [
    { id: "emerald", class: "bg-emerald-500/15 text-emerald-700 border-emerald-500/20" },
    { id: "rose", class: "bg-rose-500/15 text-rose-700 border-rose-500/20" },
    { id: "sky", class: "bg-sky-500/15 text-sky-700 border-sky-500/20" },
    { id: "amber", class: "bg-amber-500/15 text-amber-700 border-amber-500/20" },
    { id: "indigo", class: "bg-indigo-500/15 text-indigo-700 border-indigo-500/20" },
    { id: "violet", class: "bg-violet-100 text-violet-700 border-violet-200" }
  ];

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || isSaving) return;

    setIsSaving(true);
    try {
      const mode = editingTag ? "PUT" : "POST";
      const body = {
        name: trimmed,
        color,
        id: editingTag?.id,
      };

      const res = await fetch("/api/products/tags", {
        method: mode,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed");

      mutate();
      closeModal();
    } catch {
      alert(`Error ${editingTag ? "updating" : "adding"} tag.`);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!deletingTag || isDeleting) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/products/tags?id=${deletingTag.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");

      mutate();
      setDeletingTag(null);
    } catch {
      alert("Error deleting tag.");
    } finally {
      setIsDeleting(false);
    }
  }

  function openEdit(tag: any) {
    setEditingTag(tag);
    setName(tag.name);
    setColor(tag.color || "emerald");
    setOpen(true);
  }

  function closeModal() {
    setOpen(false);
    setEditingTag(null);
    setName("");
    setColor("emerald");
  }

  return (
    <ProductsPageShell
      title="Tags"
      description="Helpful for flash sales or identifying special items. These are now live."
      actions={
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="bg-[#003527] text-white px-4 py-2.5 rounded-xl font-semibold flex items-center gap-2 shadow-lg shadow-[#003527]/10"
        >
          <Plus className="size-4" /> Add tag
        </button>
      }
    >
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : tags.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center border-2 border-dashed rounded-3xl">
          <Tag className="size-12 text-muted-foreground mb-4 opacity-20" />
          <h3 className="text-lg font-semibold">No tags yet</h3>
          <p className="text-muted-foreground max-w-sm mx-auto">Create labels like "New", "On Sale", or "Expiring Soon" to quickly organize and find items on the POS.</p>
          <button onClick={() => setOpen(true)} className="mt-6 bg-[#003527] text-white px-6 py-2 rounded-xl">Create Tag</button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tags.map((t: any) => {
            const colorConfig = colors.find(c => c.id === t.color) || colors[0];
            return (
              <div key={t.id} className="p-4 rounded-2xl border bg-white flex items-center justify-between dark:bg-[#111] dark:border-white/10 group hover:shadow-md transition-all">
                <div className="flex items-center gap-4 min-w-0">
                  <div className={`size-3 shrink-0 rounded-full ${colorConfig.class.split(' ')[0]}`} />
                  <span className="font-semibold truncate">{t.name}</span>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openEdit(t)}
                    className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Edit2 className="size-4" />
                  </button>
                  <button
                    onClick={() => setDeletingTag(t)}
                    className="p-2 text-red-500 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Save Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative z-10 w-full max-w-md rounded-2xl border bg-white p-6 shadow-xl dark:bg-[#141414]">
            <h2 className="text-lg font-bold mb-4">{editingTag ? "Edit Tag" : "New Tag"}</h2>
            <form onSubmit={handleSave} className="space-y-6">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Tag Name</label>
                <input required autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. New Arrival" className="w-full p-2.5 rounded-xl border bg-transparent outline-none ring-primary/20 focus:ring-4 focus:border-primary/40 transition-all" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground uppercase tracking-widest text-[11px]">Color Scheme</label>
                <div className="flex gap-3">
                  {colors.map(c => (
                    <button type="button" key={c.id} onClick={() => setColor(c.id)} className={`size-8 rounded-full border-2 ${color === c.id ? 'border-primary scale-110 shadow-lg' : 'border-transparent hover:scale-105'} ${c.class.split(' ')[0]} transition-all`} />
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={closeModal} className="px-5 py-2.5 border rounded-xl font-medium transition-all hover:bg-muted/30">Cancel</button>
                <button type="submit" disabled={isSaving} className="bg-[#003527] text-white px-8 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-[#003527]/10 transition-all hover:brightness-110">
                  {isSaving && <Loader2 className="size-4 animate-spin" />}
                  {editingTag ? "Update" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingTag && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeletingTag(null)} />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-red-500/20 bg-white p-6 shadow-xl dark:bg-[#141414]">
            <h2 className="text-lg font-bold mb-1">Delete Tag</h2>
            <p className="text-muted-foreground text-sm mb-6">
              Are you sure you want to delete <span className="font-bold text-foreground">"{deletingTag.name}"</span>? It will be removed from all products.
            </p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setDeletingTag(null)} className="px-5 py-2.5 border rounded-xl font-semibold transition-all hover:bg-muted/30">Cancel</button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-red-600 text-white px-8 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all hover:bg-red-700 shadow-lg shadow-red-600/20"
              >
                {isDeleting && <Loader2 className="size-4 animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </ProductsPageShell>
  );
}

import { Trash2, Edit2 } from "lucide-react";
