"use client";

import { useCallback, useEffect, useState } from "react";
import {
    Loader2,
    Pencil,
    Trash2,
    UserPlus,
    Users,
    X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { authHeaders, formatWhen } from "./catalog-admin-utils";

type AdminRow = {
    id: string;
    email: string;
    firstName: string;
    lastName: string | null;
    status: string;
    createdAt: string;
    lastLoginAt: string | null;
};

type Props = {
    token: string;
    open: boolean;
    onClose: () => void;
};

export function CatalogAdminTeamModal({ token, open, onClose }: Props) {
    const [admins, setAdmins] = useState<AdminRow[]>([]);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editEmail, setEditEmail] = useState("");
    const [editFirstName, setEditFirstName] = useState("");
    const [editLastName, setEditLastName] = useState("");
    const [editStatus, setEditStatus] = useState<"active" | "suspended">("active");
    const [editPassword, setEditPassword] = useState("");
    const [editConfirmPassword, setEditConfirmPassword] = useState("");

    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState("");

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [listRes, meRes] = await Promise.all([
                fetch("/api/superadmin/accounts", { headers: authHeaders(token) }),
                fetch("/api/superadmin/me", { headers: authHeaders(token) }),
            ]);
            const listData = await listRes.json();
            const meData = await meRes.json();
            if (!listRes.ok) throw new Error(listData.error ?? `HTTP ${listRes.status}`);
            setAdmins(listData.items ?? []);
            if (meRes.ok) setCurrentUserId(meData.id ?? null);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load admins");
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        if (!open) return;
        setEditingId(null);
        setDeletingId(null);
        setDeleteConfirm("");
        setSuccess(null);
        setError(null);
        void load();
    }, [open, load]);

    const resetCreateForm = () => {
        setEmail("");
        setPassword("");
        setConfirmPassword("");
        setFirstName("");
        setLastName("");
    };

    const startEdit = (admin: AdminRow) => {
        setEditingId(admin.id);
        setDeletingId(null);
        setEditEmail(admin.email);
        setEditFirstName(admin.firstName);
        setEditLastName(admin.lastName ?? "");
        setEditStatus(admin.status === "suspended" ? "suspended" : "active");
        setEditPassword("");
        setEditConfirmPassword("");
        setError(null);
        setSuccess(null);
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditPassword("");
        setEditConfirmPassword("");
    };

    const createAdmin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        if (password.length < 12) {
            setError("Password must be at least 12 characters.");
            return;
        }
        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setSaving(true);
        try {
            const res = await fetch("/api/superadmin/accounts", {
                method: "POST",
                headers: {
                    ...authHeaders(token),
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email: email.trim(),
                    password,
                    firstName: firstName.trim(),
                    lastName: lastName.trim() || undefined,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
            setSuccess(`Created admin account for ${data.email}`);
            resetCreateForm();
            await load();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to create admin");
        } finally {
            setSaving(false);
        }
    };

    const saveEdit = async (adminId: string) => {
        setError(null);
        setSuccess(null);

        if (editPassword && editPassword.length < 12) {
            setError("New password must be at least 12 characters.");
            return;
        }
        if (editPassword && editPassword !== editConfirmPassword) {
            setError("New passwords do not match.");
            return;
        }

        const body: Record<string, string> = {
            email: editEmail.trim(),
            firstName: editFirstName.trim(),
            lastName: editLastName.trim(),
            status: editStatus,
        };
        if (editPassword) body.password = editPassword;

        setSaving(true);
        try {
            const res = await fetch(`/api/superadmin/accounts/${adminId}`, {
                method: "PATCH",
                headers: {
                    ...authHeaders(token),
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
            setSuccess("Admin account updated.");
            cancelEdit();
            await load();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to update admin");
        } finally {
            setSaving(false);
        }
    };

    const confirmDelete = async (admin: AdminRow) => {
        if (deleteConfirm.trim() !== admin.email) return;
        setSaving(true);
        setError(null);
        try {
            const res = await fetch(`/api/superadmin/accounts/${admin.id}`, {
                method: "DELETE",
                headers: authHeaders(token),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error ?? `HTTP ${res.status}`);
            }
            setSuccess(`Deleted admin ${admin.email}`);
            setDeletingId(null);
            setDeleteConfirm("");
            if (editingId === admin.id) cancelEdit();
            await load();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to delete admin");
        } finally {
            setSaving(false);
        }
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
            <div
                className="flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-lg"
                role="dialog"
                aria-labelledby="admin-team-title"
            >
                <div className="flex items-center justify-between border-b border-border px-5 py-4">
                    <div className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-primary" />
                        <h2 id="admin-team-title" className="text-lg font-semibold text-foreground">
                            Admin accounts
                        </h2>
                    </div>
                    <Button type="button" variant="ghost" size="icon-sm" onClick={onClose}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                <div className="overflow-y-auto px-5 py-4">
                    <form onSubmit={createAdmin} className="rounded-xl border border-border bg-muted/20 p-4">
                        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                            <UserPlus className="h-4 w-4" />
                            Add co-admin
                        </h3>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            <label className="grid gap-1 text-sm">
                                <span>First name</span>
                                <input
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    required
                                    className="rounded-lg border border-input bg-background px-3 py-2"
                                />
                            </label>
                            <label className="grid gap-1 text-sm">
                                <span>Last name</span>
                                <input
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                    className="rounded-lg border border-input bg-background px-3 py-2"
                                />
                            </label>
                            <label className="grid gap-1 text-sm sm:col-span-2">
                                <span>Email</span>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="rounded-lg border border-input bg-background px-3 py-2"
                                />
                            </label>
                            <label className="grid gap-1 text-sm">
                                <span>Password</span>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={12}
                                    className="rounded-lg border border-input bg-background px-3 py-2"
                                />
                            </label>
                            <label className="grid gap-1 text-sm">
                                <span>Confirm password</span>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    className="rounded-lg border border-input bg-background px-3 py-2"
                                />
                            </label>
                        </div>
                        <Button type="submit" className="mt-4" size="sm" disabled={saving}>
                            {saving && !editingId ? (
                                <>
                                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                                    Creating…
                                </>
                            ) : (
                                "Create admin account"
                            )}
                        </Button>
                    </form>

                    {success ? (
                        <p className="mt-3 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
                            {success}
                        </p>
                    ) : null}
                    {error ? (
                        <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                            {error}
                        </p>
                    ) : null}

                    <div className="mt-5">
                        <h3 className="text-sm font-semibold text-foreground">Current admins</h3>
                        {loading ? (
                            <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Loading…
                            </div>
                        ) : (
                            <ul className="mt-3 space-y-2">
                                {admins.map((a) => {
                                    const isSelf = a.id === currentUserId;
                                    const isEditing = editingId === a.id;
                                    const isDeleting = deletingId === a.id;

                                    return (
                                        <li
                                            key={a.id}
                                            className="overflow-hidden rounded-xl border border-border"
                                        >
                                            <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                                                <div className="min-w-0">
                                                    <p className="font-medium text-foreground">
                                                        {a.firstName}
                                                        {a.lastName ? ` ${a.lastName}` : ""}
                                                        {isSelf ? (
                                                            <span className="ml-2 text-xs font-normal text-muted-foreground">
                                                                (you)
                                                            </span>
                                                        ) : null}
                                                    </p>
                                                    <p className="truncate text-sm text-muted-foreground">
                                                        {a.email}
                                                    </p>
                                                    <p className="mt-1 text-xs text-muted-foreground">
                                                        <span
                                                            className={cn(
                                                                "capitalize",
                                                                a.status === "suspended" &&
                                                                    "text-amber-600"
                                                            )}
                                                        >
                                                            {a.status}
                                                        </span>
                                                        {a.lastLoginAt ? (
                                                            <span>
                                                                {" "}
                                                                · Last login {formatWhen(a.lastLoginAt)}
                                                            </span>
                                                        ) : (
                                                            <span> · Never signed in</span>
                                                        )}
                                                    </p>
                                                </div>
                                                <div className="flex shrink-0 gap-2">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => startEdit(a)}
                                                        disabled={saving}
                                                    >
                                                        <Pencil className="mr-1 h-3.5 w-3.5" />
                                                        Edit
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className="text-destructive hover:text-destructive"
                                                        disabled={saving || isSelf}
                                                        title={
                                                            isSelf
                                                                ? "Use My account or sign out"
                                                                : undefined
                                                        }
                                                        onClick={() => {
                                                            setDeletingId(a.id);
                                                            setEditingId(null);
                                                            setDeleteConfirm("");
                                                            setError(null);
                                                        }}
                                                    >
                                                        <Trash2 className="mr-1 h-3.5 w-3.5" />
                                                        Delete
                                                    </Button>
                                                </div>
                                            </div>

                                            {isEditing ? (
                                                <div className="border-t border-border bg-muted/20 px-4 py-4">
                                                    <div className="grid gap-3 sm:grid-cols-2">
                                                        <label className="grid gap-1 text-sm">
                                                            <span>First name</span>
                                                            <input
                                                                value={editFirstName}
                                                                onChange={(e) =>
                                                                    setEditFirstName(e.target.value)
                                                                }
                                                                className="rounded-lg border border-input bg-background px-3 py-2"
                                                            />
                                                        </label>
                                                        <label className="grid gap-1 text-sm">
                                                            <span>Last name</span>
                                                            <input
                                                                value={editLastName}
                                                                onChange={(e) =>
                                                                    setEditLastName(e.target.value)
                                                                }
                                                                className="rounded-lg border border-input bg-background px-3 py-2"
                                                            />
                                                        </label>
                                                        <label className="grid gap-1 text-sm sm:col-span-2">
                                                            <span>Email</span>
                                                            <input
                                                                type="email"
                                                                value={editEmail}
                                                                onChange={(e) =>
                                                                    setEditEmail(e.target.value)
                                                                }
                                                                className="rounded-lg border border-input bg-background px-3 py-2"
                                                            />
                                                        </label>
                                                        <label className="grid gap-1 text-sm">
                                                            <span>Status</span>
                                                            <select
                                                                value={editStatus}
                                                                onChange={(e) =>
                                                                    setEditStatus(
                                                                        e.target
                                                                            .value as "active" | "suspended"
                                                                    )
                                                                }
                                                                disabled={isSelf}
                                                                className="rounded-lg border border-input bg-background px-3 py-2"
                                                            >
                                                                <option value="active">Active</option>
                                                                <option value="suspended">
                                                                    Suspended
                                                                </option>
                                                            </select>
                                                        </label>
                                                        <label className="grid gap-1 text-sm">
                                                            <span>New password</span>
                                                            <input
                                                                type="password"
                                                                value={editPassword}
                                                                onChange={(e) =>
                                                                    setEditPassword(e.target.value)
                                                                }
                                                                placeholder="Leave blank to keep"
                                                                className="rounded-lg border border-input bg-background px-3 py-2"
                                                            />
                                                        </label>
                                                        <label className="grid gap-1 text-sm sm:col-span-2">
                                                            <span>Confirm new password</span>
                                                            <input
                                                                type="password"
                                                                value={editConfirmPassword}
                                                                onChange={(e) =>
                                                                    setEditConfirmPassword(
                                                                        e.target.value
                                                                    )
                                                                }
                                                                className="rounded-lg border border-input bg-background px-3 py-2"
                                                            />
                                                        </label>
                                                    </div>
                                                    <div className="mt-3 flex gap-2">
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            disabled={saving}
                                                            onClick={() => void saveEdit(a.id)}
                                                        >
                                                            Save changes
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={cancelEdit}
                                                        >
                                                            Cancel
                                                        </Button>
                                                    </div>
                                                </div>
                                            ) : null}

                                            {isDeleting ? (
                                                <div className="border-t border-destructive/20 bg-destructive/5 px-4 py-4">
                                                    <p className="text-sm text-foreground">
                                                        Delete{" "}
                                                        <span className="font-medium">{a.email}</span>
                                                        ? Type their email to confirm.
                                                    </p>
                                                    <input
                                                        value={deleteConfirm}
                                                        onChange={(e) =>
                                                            setDeleteConfirm(e.target.value)
                                                        }
                                                        placeholder={a.email}
                                                        className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                                                    />
                                                    <div className="mt-3 flex gap-2">
                                                        <Button
                                                            type="button"
                                                            variant="destructive"
                                                            size="sm"
                                                            disabled={
                                                                saving ||
                                                                deleteConfirm.trim() !== a.email
                                                            }
                                                            onClick={() => void confirmDelete(a)}
                                                        >
                                                            Permanently delete
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => {
                                                                setDeletingId(null);
                                                                setDeleteConfirm("");
                                                            }}
                                                        >
                                                            Cancel
                                                        </Button>
                                                    </div>
                                                </div>
                                            ) : null}
                                        </li>
                                    );
                                })}
                                {admins.length === 0 ? (
                                    <li className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                                        No admin accounts found.
                                    </li>
                                ) : null}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
