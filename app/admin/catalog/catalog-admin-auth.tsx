"use client";

import { useEffect, useState } from "react";
import { Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

type SetupState = {
    configured: boolean;
    canBootstrap: boolean;
    hasAccounts: boolean;
} | null;

type Props = {
    onAuthenticated: (token: string) => void;
};

export function CatalogAdminAuth({ onAuthenticated }: Props) {
    const [setup, setSetup] = useState<SetupState>(null);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        void fetch("/api/superadmin/auth/setup")
            .then((r) => r.json())
            .then((data: SetupState) => {
                setSetup(data);
            })
            .catch(() => setSetup({ configured: false, canBootstrap: false, hasAccounts: false }));
    }, []);

    const login = async (loginEmail: string, loginPassword: string) => {
        const res = await fetch("/api/superadmin/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: loginEmail.trim(), password: loginPassword }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
        onAuthenticated(data.accessToken as string);
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);
        try {
            await login(email, password);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Login failed");
        } finally {
            setLoading(false);
            setPassword("");
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
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

        setLoading(true);
        try {
            const res = await fetch("/api/superadmin/accounts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: email.trim(),
                    password,
                    firstName: firstName.trim(),
                    lastName: lastName.trim() || undefined,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);

            setSuccess("Account created. Signing you in…");
            await login(email, password);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to create account");
            setLoading(false);
            setPassword("");
            setConfirmPassword("");
        }
    };

    const showRegister = setup?.canBootstrap === true;

    return (
        <div className="min-h-dvh bg-gradient-to-b from-background via-background to-muted/40">
            <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-4 py-16">
                <div className="mb-8 text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
                        <Sparkles className="h-6 w-6" aria-hidden />
                    </div>
                    <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-foreground">
                        Platform Admin
                    </h1>
                    <p className="mt-2 text-sm text-muted-foreground">
                        {setup?.canBootstrap
                            ? "Create the first admin account to get started"
                            : "Sign in to manage shops, subscriptions, and catalog"}
                    </p>
                </div>

                <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                    {setup === null ? (
                        <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                            <Loader2 className="h-5 w-5 animate-spin" />
                            Checking admin setup…
                        </div>
                    ) : !setup.configured ? (
                        <p className="rounded-lg bg-destructive/10 px-3 py-3 text-sm text-destructive">
                            Superadmin login is not configured on this server. Ask your developer
                            to set <code className="text-xs">SUPERADMIN_JWT_SECRET</code> in the
                            environment.
                        </p>
                    ) : (
                        <>
                            {setup.hasAccounts ? (
                                <div className="mb-5 flex items-center gap-2 text-sm text-muted-foreground">
                                    <ShieldCheck className="h-4 w-4 shrink-0" />
                                    Sign in with your admin credentials
                                </div>
                            ) : (
                                <div className="mb-5 flex items-center gap-2 text-sm text-muted-foreground">
                                    <ShieldCheck className="h-4 w-4 shrink-0" />
                                    No admin accounts yet — create yours below
                                </div>
                            )}

                            {showRegister ? (
                                <form onSubmit={handleRegister} className="grid gap-4">
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <label className="grid gap-1.5 text-sm">
                                            <span className="font-medium text-foreground">
                                                First name
                                            </span>
                                            <input
                                                value={firstName}
                                                onChange={(e) => setFirstName(e.target.value)}
                                                required
                                                autoComplete="given-name"
                                                className="rounded-lg border border-input bg-background px-3 py-2.5 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                            />
                                        </label>
                                        <label className="grid gap-1.5 text-sm">
                                            <span className="font-medium text-foreground">
                                                Last name
                                            </span>
                                            <input
                                                value={lastName}
                                                onChange={(e) => setLastName(e.target.value)}
                                                autoComplete="family-name"
                                                className="rounded-lg border border-input bg-background px-3 py-2.5 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                            />
                                        </label>
                                    </div>
                                    <label className="grid gap-1.5 text-sm">
                                        <span className="font-medium text-foreground">Email</span>
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                            autoComplete="email"
                                            className="rounded-lg border border-input bg-background px-3 py-2.5 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                        />
                                    </label>
                                    <label className="grid gap-1.5 text-sm">
                                        <span className="font-medium text-foreground">Password</span>
                                        <input
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                            minLength={12}
                                            autoComplete="new-password"
                                            className="rounded-lg border border-input bg-background px-3 py-2.5 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                        />
                                        <span className="text-xs text-muted-foreground">
                                            At least 12 characters
                                        </span>
                                    </label>
                                    <label className="grid gap-1.5 text-sm">
                                        <span className="font-medium text-foreground">
                                            Confirm password
                                        </span>
                                        <input
                                            type="password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            required
                                            autoComplete="new-password"
                                            className="rounded-lg border border-input bg-background px-3 py-2.5 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                        />
                                    </label>
                                    <Button type="submit" disabled={loading} className="w-full">
                                        {loading ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Creating account…
                                            </>
                                        ) : (
                                            "Create admin account"
                                        )}
                                    </Button>
                                </form>
                            ) : (
                                <form onSubmit={handleLogin} className="grid gap-4">
                                    <label className="grid gap-1.5 text-sm">
                                        <span className="font-medium text-foreground">Email</span>
                                        <input
                                            type="email"
                                            autoComplete="username"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                            className="rounded-lg border border-input bg-background px-3 py-2.5 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                        />
                                    </label>
                                    <label className="grid gap-1.5 text-sm">
                                        <span className="font-medium text-foreground">Password</span>
                                        <input
                                            type="password"
                                            autoComplete="current-password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                            className="rounded-lg border border-input bg-background px-3 py-2.5 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                        />
                                    </label>
                                    <Button type="submit" disabled={loading} className="w-full">
                                        {loading ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Signing in…
                                            </>
                                        ) : (
                                            "Sign in to admin"
                                        )}
                                    </Button>
                                </form>
                            )}

                            {success ? (
                                <p className="mt-4 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
                                    {success}
                                </p>
                            ) : null}
                            {error ? (
                                <p
                                    className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
                                    role="alert"
                                >
                                    {error}
                                </p>
                            ) : null}
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}
