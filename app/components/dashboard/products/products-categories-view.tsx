"use client";

import { useState } from "react";
import { FolderTree, Plus, Loader2, Download } from "lucide-react";
import { ProductsPageShell } from "./products-page-shell";
import { useCategories } from "./products-data-hooks";
import { useBranchContext } from "../branch-context";
import { useBranches } from "../branches/branches-data-hooks";
import { SyncProgressModal } from "./sync-progress-modal";

export function ProductsCategoriesView() {
  const { categories = [], isLoading, mutate } = useCategories();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [deletingCategory, setDeletingCategory] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);

  const { branchId } = useBranchContext();
  const { branches = [] } = useBranches();
  const currentBranch = branches?.find?.((b: any) => b.id === branchId);
  const isMainBranch = currentBranch?.isMain;
  const showSyncButton = branchId !== "all" && !isMainBranch;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || isSaving) return;

    setIsSaving(true);
    try {
      const mode = editingCategory ? "PUT" : "POST";
      const body = {
        name: trimmed,
        id: editingCategory?.id,
      };

      const res = await fetch("/api/products/categories", {
        method: mode,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed");

      mutate();
      closeModal();
    } catch {
      alert(`Error ${editingCategory ? "updating" : "adding"} category.`);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!deletingCategory || isDeleting) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/products/categories?id=${deletingCategory.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");

      mutate();
      setDeletingCategory(null);
    } catch {
      alert("Error deleting category.");
    } finally {
      setIsDeleting(false);
    }
  }

  function openEdit(c: any) {
    setEditingCategory(c);
    setName(c.name);
    setOpen(true);
  }

  function closeModal() {
    setOpen(false);
    setEditingCategory(null);
    setName("");
  }

  const handleSyncMain = () => setIsSyncModalOpen(true);

  return (
    <ProductsPageShell
      title="Categories"
      description="Group products for the catalog and POS. These are now live in your database."
      actions={
        <div className="flex items-center gap-3">
          {showSyncButton && (
            <button
              onClick={handleSyncMain}
              className="btn-secondary px-4 py-2.5 rounded-xl border border-border flex items-center gap-2 text-[14px] font-medium"
            >
              <Download className="size-4" />
              Import from Main
            </button>
          )}
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="bg-[#003527] text-white px-4 py-2.5 rounded-xl font-semibold flex items-center gap-2 text-[14px]"
          >
            <Plus className="size-4" /> Add category
          </button>
        </div>
      }
    >
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : categories.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center border-2 border-dashed rounded-3xl">
          <FolderTree className="size-12 text-muted-foreground mb-4 opacity-20" />
          <h3 className="text-lg font-semibold">No categories yet</h3>
          <p className="text-muted-foreground max-w-xs mx-auto">Group your products together to make them easier to find on the POS terminal.</p>
          <button onClick={() => setOpen(true)} className="mt-6 bg-[#003527] text-white px-6 py-2 rounded-xl">Create Category</button>
        </div>
      ) : (
        <div className="border rounded-2xl overflow-hidden bg-white dark:bg-[#111] dark:border-white/10 shadow-sm">
          <ul className="divide-y dark:divide-white/5">
            {categories.map((c: any) => (
              <li key={c.id} className="p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-[#006c49]/5 flex items-center justify-center text-[#006c49] dark:bg-[#6ffbbe]/10 dark:text-[#6ffbbe]">
                    <FolderTree className="size-5" />
                  </div>
                  <p className="font-bold text-[16px] tracking-tight">{c.name}</p>
                </div>
                <div className="flex items-center gap-3 pt-3 border-t sm:pt-0 sm:border-t-0 dark:border-white/5">
                  <button
                    onClick={() => openEdit(c)}
                    className="flex-1 sm:flex-none text-sm font-semibold text-muted-foreground py-2 px-4 rounded-lg bg-muted/20 sm:bg-transparent hover:text-foreground transition-all"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setDeletingCategory(c)}
                    className="flex-1 sm:flex-none text-sm font-semibold text-red-500 py-2 px-4 rounded-lg bg-red-500/5 sm:bg-transparent hover:bg-red-500/10 transition-all"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <SyncProgressModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        onComplete={() => mutate()}
        type="categories"
      />

      {/* Save Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative z-10 w-full max-w-md rounded-2xl border bg-white p-6 shadow-xl dark:bg-[#141414]">
            <h2 className="text-lg font-bold mb-4">{editingCategory ? "Edit Category" : "New Category"}</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Category Name</label>
                <input
                  autoFocus
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Beverages"
                  className="w-full rounded-xl border p-2.5 bg-transparent"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={closeModal} className="px-4 py-2 border rounded-xl font-semibold">Cancel</button>
                <button type="submit" disabled={isSaving} className="bg-[#003527] text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 transition-all hover:bg-[#004d39]">
                  {isSaving && <Loader2 className="size-4 animate-spin" />}
                  {editingCategory ? "Update" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeletingCategory(null)} />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-red-500/20 bg-white p-6 shadow-xl dark:bg-[#141414]">
            <h2 className="text-lg font-bold mb-1">Delete Category</h2>
            <p className="text-muted-foreground text-sm mb-6">
              Are you sure you want to delete <span className="font-bold text-foreground">"{deletingCategory.name}"</span>? This will also remove the category from any products assigned to it.
            </p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setDeletingCategory(null)} className="px-5 py-2.5 border rounded-xl font-semibold transition-all hover:bg-muted/30">Cancel</button>
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
