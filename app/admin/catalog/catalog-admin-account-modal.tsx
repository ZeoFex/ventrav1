"use client";

import { useCallback, useEffect, useState } from "react";
import { KeyRound, Loader2, UserCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authHeaders } from "./catalog-admin-utils";

type Profile = {
    id: string;
    email: string;
    firstName: string;
    lastName: string | null;
};

type Props = {
    token: string;
    open: boolean;
    onClose: () => void;
    onUpdated?: (profile: Profile) => void;
};

export function CatalogAdminAccountModal({ token, open, onClose, onUpdated }: Props) {
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const [currentPassword, setCurrentPassword] = useState("");
    const [email, setEmail] = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/superadmin/me", {
                headers: authHeaders(token),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
            setProfile(data);
            setEmail(data.email);
            setFirstName(data.firstName);
            setLastName(data.lastName ?? "");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load profile");
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        if (!open) return;
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setSuccess(null);
        setError(null);
        void load();
    }, [open, load]);

    const save = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        if (!currentPassword) {
            setError("Enter your current password to save changes.");
            return;
        }
        if (newPassword && newPassword.length < 12) {
            setError("New password must be at least 12 characters.");
            return;
        }
        if (newPassword && newPassword !== confirmPassword) {
            setError("New passwords do not match.");
            return;
        }

        setSaving(true);
        try {
            const body: Record<string, string> = { currentPassword };
            if (email.trim() !== profile?.email) body.email = email.trim();
            if (firstName.trim() !== profile?.firstName) body.firstName = firstName.trim();
            const trimmedLast = lastName.trim();
            if (trimmedLast !== (profile?.lastName ?? "")) body.lastName = trimmedLast;
            if (newPassword) body.newPassword = newPassword;

            if (Object.keys(body).length === 1) {
                setError("No changes to save.");
                setSaving(false);
                return;
            }

            const res = await fetch("/api/superadmin/me", {
                method: "PATCH",
                headers: {
                    ...authHeaders(token),
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);

            const next = data.user as Profile;
            setProfile(next);
            setEmail(next.email);
            setFirstName(next.firstName);
            setLastName(next.lastName ?? "");
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
            setSuccess("Your account was updated.");
            onUpdated?.(next);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to update account");
        } finally {
            setSaving(false);
        }
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
            <div
                className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-lg"
                role="dialog"
                aria-labelledby="my-account-title"
            >
                <div className="flex items-center justify-between border-b border-border px-5 py-4">
                    <div className="flex items-center gap-2">
                        <UserCircle className="h-5 w-5 text-primary" />
                        <h2 id="my-account-title" className="text-lg font-semibold text-foreground">
                            My account
                        </h2>
                    </div>
                    <Button type="button" variant="ghost" size="icon-sm" onClick={onClose}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                <div className="px-5 py-4">
                    {loading ? (
                        <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                            <Loader2 className="h-5 w-5 animate-spin" />
                            Loading…
                        </div>
                    ) : (
                        <form onSubmit={save} className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                Change your sign-in email or password. Your current password is
                                required to confirm any update.
                            </p>

                            <div className="grid gap-3 sm:grid-cols-2">
                                <label className="grid gap-1 text-sm">
                                    <span className="font-medium">First name</span>
                                    <input
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        required
                                        className="rounded-lg border border-input bg-background px-3 py-2"
                                    />
                                </label>
                                <label className="grid gap-1 text-sm">
                                    <span className="font-medium">Last name</span>
                                    <input
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        className="rounded-lg border border-input bg-background px-3 py-2"
                                    />
                                </label>
                            </div>

                            <label className="grid gap-1 text-sm">
                                <span className="font-medium">Sign-in email</span>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    autoComplete="email"
                                    className="rounded-lg border border-input bg-background px-3 py-2"
                                />
                            </label>

                            <div className="rounded-xl border border-border bg-muted/20 p-4">
                                <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                                    <KeyRound className="h-4 w-4" />
                                    Change password
                                </h3>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Leave blank to keep your current password.
                                </p>
                                <div className="mt-3 grid gap-3">
                                    <label className="grid gap-1 text-sm">
                                        <span>New password</span>
                                        <input
                                            type="password"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            autoComplete="new-password"
                                            minLength={12}
                                            className="rounded-lg border border-input bg-background px-3 py-2"
                                        />
                                    </label>
                                    <label className="grid gap-1 text-sm">
                                        <span>Confirm new password</span>
                                        <input
                                            type="password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            autoComplete="new-password"
                                            className="rounded-lg border border-input bg-background px-3 py-2"
                                        />
                                    </label>
                                </div>
                            </div>

                            <label className="grid gap-1 text-sm">
                                <span className="font-medium text-foreground">
                                    Current password (required)
                                </span>
                                <input
                                    type="password"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    required
                                    autoComplete="current-password"
                                    className="rounded-lg border border-input bg-background px-3 py-2"
                                />
                            </label>

                            {success ? (
                                <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
                                    {success}
                                </p>
                            ) : null}
                            {error ? (
                                <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                                    {error}
                                </p>
                            ) : null}

                            <div className="flex justify-end gap-2 pt-1">
                                <Button type="button" variant="outline" onClick={onClose}>
                                    Close
                                </Button>
                                <Button type="submit" disabled={saving}>
                                    {saving ? (
                                        <>
                                            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                                            Saving…
                                        </>
                                    ) : (
                                        "Save changes"
                                    )}
                                </Button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
