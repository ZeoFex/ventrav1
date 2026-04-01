"use client";

import { useState, useEffect } from "react";
import { X, Check } from "lucide-react";
import { DASHBOARD_NAV_ITEMS, type DashboardNavItem } from "../sidebar/dashboard-nav-config";

type AddRoleModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (roleName: string, permissions: string[]) => void;
    initialRoleName?: string;
    initialPermissions?: string[];
};

export function AddRoleModal({ isOpen, onClose, onAdd, initialRoleName = "", initialPermissions = [] }: AddRoleModalProps) {
    const [roleName, setRoleName] = useState(initialRoleName);
    const [selectedPermissions, setSelectedPermissions] = useState<string[]>(initialPermissions);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setRoleName(initialRoleName);
            setSelectedPermissions(initialPermissions);
        }
    }, [isOpen, initialRoleName, initialPermissions]);

    if (!isOpen) return null;

    const togglePermission = (id: string, parentId?: string) => {
        setSelectedPermissions((prev) => {
            const isRemoving = prev.includes(id);

            // If it's a child and being added, but parent is missing -> block
            if (!isRemoving && parentId && !prev.includes(parentId)) {
                return prev;
            }

            let next = isRemoving ? prev.filter((p) => p !== id) : [...prev, id];

            // If it's a parent and being removed -> remove all children too
            if (isRemoving && !parentId) {
                const item = DASHBOARD_NAV_ITEMS.find(n => n.id === id);
                if (item?.children) {
                    const childIds = item.children.map(c => c.id);
                    next = next.filter(p => !childIds.includes(p));
                }
            }

            return next;
        });
    };

    const toggleGroup = (item: DashboardNavItem) => {
        const itemIds = [item.id, ...(item.children?.map((c) => c.id) || [])];
        const allSelected = itemIds.every((id) => selectedPermissions.includes(id));

        if (allSelected) {
            setSelectedPermissions((prev) => prev.filter((id) => !itemIds.includes(id)));
        } else {
            setSelectedPermissions((prev) => {
                const next = [...prev];
                itemIds.forEach((id) => {
                    if (!next.includes(id)) next.push(id);
                });
                return next;
            });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!roleName.trim() || isSaving) return;

        setIsSaving(true);
        try {
            const res = await fetch("/api/staff/roles", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: roleName.trim(),
                    permissionKeys: selectedPermissions,
                }),
            });

            if (!res.ok) throw new Error("Failed to save role");

            onAdd(roleName.trim(), selectedPermissions);
            setRoleName("");
            setSelectedPermissions([]);
        } catch (err) {
            alert("Error saving role. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-2xl animate-in fade-in zoom-in duration-200 rounded-[1.5rem] border border-[#eef0f2] bg-white p-6 shadow-2xl dark:border-white/[0.08] dark:bg-[#111]">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold tracking-tight text-foreground font-[family-name:var(--font-display)]">
                            Create Custom Role
                        </h2>
                        <p className="text-sm text-muted-foreground mt-1">
                            Define the menus and pages this role can access.
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={isSaving}
                        className="rounded-full p-2 hover:bg-[#f4f5f7] dark:hover:bg-white/5 transition-colors disabled:opacity-50"
                    >
                        <X className="size-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-[13px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                            Role Name
                        </label>
                        <input
                            autoFocus
                            required
                            disabled={isSaving}
                            placeholder="e.g. Floor Supervisor"
                            value={roleName}
                            onChange={(e) => setRoleName(e.target.value)}
                            className="w-full rounded-xl border border-[#e5e7eb] bg-white px-4 py-3 text-[14px] outline-none focus:border-[#006c49]/40 focus:ring-2 focus:ring-[#006c49]/20 dark:border-white/[0.12] dark:bg-[#141414] disabled:opacity-50"
                        />
                    </div>

                    <div className="space-y-4">
                        <label className="block text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Permissions (Accessible Menus)
                        </label>

                        <div className="max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                            <div className="grid gap-3 sm:grid-cols-2">
                                {DASHBOARD_NAV_ITEMS.map((item) => (
                                    <div
                                        key={item.id}
                                        className="rounded-2xl border border-[#f0f2f4] bg-[#fafafa] p-4 dark:border-white/[0.04] dark:bg-white/[0.02]"
                                    >
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="font-semibold text-[14px]">{item.label}</span>
                                            <button
                                                type="button"
                                                disabled={isSaving}
                                                onClick={() => toggleGroup(item)}
                                                className="text-[11px] font-medium text-[#006c49] dark:text-[#6ffbbe] hover:underline disabled:opacity-50"
                                            >
                                                {item.children?.every(c => selectedPermissions.includes(c.id)) && selectedPermissions.includes(item.id)
                                                    ? "Deselect all"
                                                    : "Select all"}
                                            </button>
                                        </div>

                                        <div className="space-y-2">
                                            <div
                                                onClick={() => !isSaving && togglePermission(item.id)}
                                                className="flex items-center gap-3 cursor-pointer group"
                                            >
                                                <div
                                                    className={`flex size-5 shrink-0 items-center justify-center rounded-md border transition-all ${selectedPermissions.includes(item.id)
                                                        ? "bg-[#006c49] border-[#006c49] dark:bg-[#6ffbbe] dark:border-[#6ffbbe]"
                                                        : "border-[#d1d5db] group-hover:border-[#006c49]/50 dark:border-white/20"
                                                        } ${isSaving ? "opacity-50" : ""}`}
                                                >
                                                    {selectedPermissions.includes(item.id) && <Check className="size-3.5 text-white dark:text-black" strokeWidth={3} />}
                                                </div>
                                                <span className="text-[13px] text-foreground/80 font-medium">Main Menu</span>
                                            </div>

                                            {item.children?.map((child) => {
                                                const parentSelected = selectedPermissions.includes(item.id);
                                                return (
                                                    <div
                                                        key={child.id}
                                                        onClick={() => !isSaving && parentSelected && togglePermission(child.id, item.id)}
                                                        className={`flex items-center gap-3 group ml-4 ${parentSelected ? "cursor-pointer" : "opacity-30 cursor-not-allowed"}`}
                                                    >
                                                        <div
                                                            className={`flex size-5 shrink-0 items-center justify-center rounded-md border transition-all ${selectedPermissions.includes(child.id)
                                                                ? "bg-[#006c49]/60 border-[#006c49] dark:bg-[#6ffbbe]/60 dark:border-[#6ffbbe]"
                                                                : "border-[#d1d5db] group-hover:border-[#006c49]/50 dark:border-white/20"
                                                                } ${isSaving ? "opacity-50" : ""}`}
                                                        >
                                                            {selectedPermissions.includes(child.id) && <Check className="size-3.5 text-white dark:text-black" strokeWidth={3} />}
                                                        </div>
                                                        <span className="text-[13px] text-foreground/60">{child.label}</span>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSaving}
                            className="flex-1 rounded-xl border border-[#e5e7eb] py-3 text-[14px] font-medium transition-colors hover:bg-[#f4f5f7] dark:border-white/[0.12] dark:hover:bg-white/5 disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!roleName.trim() || isSaving}
                            className="flex-1 rounded-xl bg-gradient-to-br from-[#003527] to-[#064e3b] py-3 text-[14px] font-semibold text-white shadow-lg hover:brightness-110 disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-2"
                        >
                            {isSaving && <Check className="size-4 animate-pulse" />}
                            {isSaving ? "Saving..." : "Save Role"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
