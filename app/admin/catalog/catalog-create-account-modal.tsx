"use client";

import { useMemo, useState } from "react";
import { Check, Copy, KeyRound, Loader2, Store, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BUSINESS_TYPES } from "@/config/business-types";
import { PLANS } from "@/config/plans";
import {
    getPasswordChecks,
    getPasswordRuleRows,
    isPasswordValid,
} from "@/lib/password-requirements";
import { authHeaders } from "./catalog-admin-utils";

type Props = {
    token: string;
    open: boolean;
    onClose: () => void;
    onCreated: () => void;
};

type CreatedAccount = {
    businessName: string;
    email: string;
    password: string;
    plan: string;
    loginUrl: string;
};

function generateLoginPassword(): string {
    const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    const lower = "abcdefghijkmnopqrstuvwxyz";
    const digits = "23456789";
    const special = "!@#$%";
    const all = upper + lower + digits + special;
    const pick = (source: string) => source[Math.floor(Math.random() * source.length)] ?? "a";
    const chars = [pick(upper), pick(lower), pick(digits), pick(special)];
    while (chars.length < 12) chars.push(pick(all));
    for (let i = chars.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        const current = chars[i] ?? "a";
        chars[i] = chars[j] ?? "a";
        chars[j] = current;
    }
    return chars.join("");
}

function loginDetailsText(account: CreatedAccount): string {
    return [
        "VentraPOS login",
        `Shop: ${account.businessName}`,
        `Plan: ${account.plan}`,
        `Email: ${account.email}`,
        `Password: ${account.password}`,
        `Sign in: ${account.loginUrl}`,
        "No verification code is required.",
    ].join("\n");
}

export function CatalogCreateAccountModal({ token, open, onClose, onCreated }: Props) {
    const [businessName, setBusinessName] = useState("");
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [broughtByName, setBroughtByName] = useState("");
    const [businessType, setBusinessType] = useState("general_retail_store");
    const [plan, setPlan] = useState("starter");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [created, setCreated] = useState<CreatedAccount | null>(null);
    const [copied, setCopied] = useState(false);

    const checks = useMemo(() => getPasswordChecks(password), [password]);
    const rules = getPasswordRuleRows();

    if (!open) return null;

    const resetForm = () => {
        setBusinessName("");
        setFullName("");
        setEmail("");
        setPhone("");
        setBroughtByName("");
        setBusinessType("general_retail_store");
        setPlan("starter");
        setPassword("");
        setConfirmPassword("");
        setError(null);
        setCreated(null);
        setCopied(false);
    };

    const close = () => {
        resetForm();
        onClose();
    };

    const submit = async (event: React.FormEvent) => {
        event.preventDefault();
        setError(null);
        if (!isPasswordValid(password)) {
            setError("Choose a stronger password before creating the account.");
            return;
        }
        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setSaving(true);
        try {
            const res = await fetch("/api/platform/accounts/provision", {
                method: "POST",
                headers: {
                    ...authHeaders(token),
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    businessName: businessName.trim(),
                    fullName: fullName.trim(),
                    email: email.trim(),
                    phone: phone.trim() || undefined,
                    broughtByName: broughtByName.trim() || undefined,
                    password,
                    plan,
                    businessType,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
            const loginUrl = `${window.location.origin}${data.loginPath ?? "/login"}`;
            setCreated({
                businessName: data.businessName ?? businessName.trim(),
                email: data.email ?? email.trim(),
                password,
                plan: PLANS.find((item) => item.id === plan)?.name ?? plan,
                loginUrl,
            });
            onCreated();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to create account");
        } finally {
            setSaving(false);
        }
    };

    const copyDetails = async () => {
        if (!created) return;
        try {
            await navigator.clipboard.writeText(loginDetailsText(created));
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
        } catch {
            setError("Could not copy. Select the details and copy them manually.");
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 p-0 backdrop-blur-sm sm:items-center sm:p-4">
            <div
                className="flex max-h-[94dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-2xl border border-border bg-card shadow-lg sm:rounded-2xl"
                role="dialog"
                aria-labelledby="create-account-title"
            >
                <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
                    <div>
                        <h2 id="create-account-title" className="flex items-center gap-2 text-lg font-semibold text-foreground">
                            <Store className="h-5 w-5 text-primary" />
                            Create shop account
                        </h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Set the login now. The owner can sign in immediately — no verification code.
                        </p>
                    </div>
                    <Button type="button" variant="ghost" size="icon-sm" onClick={close} aria-label="Close">
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                {created ? (
                    <div className="space-y-4 overflow-y-auto px-5 py-5">
                        <div className="rounded-xl border border-[#006c49]/25 bg-[#006c49]/8 px-4 py-3 text-sm text-[#006c49] dark:text-[#6ffbbe]">
                            Account is active. Share these details with the owner.
                        </div>
                        {error ? (
                            <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                                {error}
                            </p>
                        ) : null}
                        <dl className="space-y-3 rounded-xl border border-border bg-muted/20 p-4 text-sm">
                            <div>
                                <dt className="text-muted-foreground">Shop</dt>
                                <dd className="font-medium text-foreground">{created.businessName}</dd>
                            </div>
                            <div>
                                <dt className="text-muted-foreground">Email</dt>
                                <dd className="font-mono text-foreground">{created.email}</dd>
                            </div>
                            <div>
                                <dt className="text-muted-foreground">Password</dt>
                                <dd className="font-mono text-foreground">{created.password}</dd>
                            </div>
                            <div>
                                <dt className="text-muted-foreground">Sign in</dt>
                                <dd className="break-all font-medium text-foreground">{created.loginUrl}</dd>
                            </div>
                        </dl>
                        <div className="flex flex-col gap-2 sm:flex-row">
                            <Button type="button" className="flex-1" onClick={() => void copyDetails()}>
                                {copied ? <Check className="mr-1.5 h-4 w-4" /> : <Copy className="mr-1.5 h-4 w-4" />}
                                {copied ? "Copied" : "Copy login details"}
                            </Button>
                            <Button type="button" variant="outline" onClick={resetForm}>
                                Create another
                            </Button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={submit} className="space-y-4 overflow-y-auto px-5 py-5">
                        {error ? (
                            <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                                {error}
                            </p>
                        ) : null}
                        <div className="grid gap-3 sm:grid-cols-2">
                            <label className="grid gap-1 text-sm sm:col-span-2">
                                <span className="font-medium">Shop name</span>
                                <input
                                    required
                                    value={businessName}
                                    onChange={(e) => setBusinessName(e.target.value)}
                                    placeholder="FreshMart"
                                    className="rounded-lg border border-input bg-background px-3 py-2.5 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                />
                            </label>
                            <label className="grid gap-1 text-sm sm:col-span-2">
                                <span className="font-medium">Owner name</span>
                                <input
                                    required
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    placeholder="Ama Mensah"
                                    className="rounded-lg border border-input bg-background px-3 py-2.5 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                />
                            </label>
                            <label className="grid gap-1 text-sm">
                                <span className="font-medium">Email</span>
                                <input
                                    required
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="owner@shop.com"
                                    className="rounded-lg border border-input bg-background px-3 py-2.5 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                />
                            </label>
                            <label className="grid gap-1 text-sm">
                                <span className="font-medium">Phone</span>
                                <input
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder="Optional"
                                    className="rounded-lg border border-input bg-background px-3 py-2.5 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                />
                            </label>
                            <label className="grid gap-1 text-sm sm:col-span-2">
                                <span className="font-medium">Brought by</span>
                                <input
                                    value={broughtByName}
                                    onChange={(e) => setBroughtByName(e.target.value)}
                                    maxLength={120}
                                    placeholder="Person who brought this shop owner"
                                    className="rounded-lg border border-input bg-background px-3 py-2.5 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                />
                            </label>
                            <label className="grid gap-1 text-sm">
                                <span className="font-medium">Shop type</span>
                                <select
                                    value={businessType}
                                    onChange={(e) => setBusinessType(e.target.value)}
                                    className="rounded-lg border border-input bg-background px-3 py-2.5 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                    {BUSINESS_TYPES.map((type) => (
                                        <option key={type.id} value={type.id}>
                                            {type.label}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label className="grid gap-1 text-sm">
                                <span className="font-medium">Plan</span>
                                <select
                                    value={plan}
                                    onChange={(e) => setPlan(e.target.value)}
                                    className="rounded-lg border border-input bg-background px-3 py-2.5 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                    {PLANS.map((item) => (
                                        <option key={item.id} value={item.id}>
                                            {item.name}
                                            {item.custom
                                                ? " · Custom"
                                                : item.priceMonthly > 0
                                                  ? ` · GHS ${item.priceMonthly}/mo`
                                                  : " · Free"}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        </div>

                        <div className="rounded-xl border border-border bg-muted/20 p-4">
                            <div className="flex items-center justify-between gap-3">
                                <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                                    <KeyRound className="h-4 w-4" />
                                    Login password
                                </p>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        const next = generateLoginPassword();
                                        setPassword(next);
                                        setConfirmPassword(next);
                                    }}
                                >
                                    Generate
                                </Button>
                            </div>
                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                <input
                                    required
                                    type="text"
                                    autoComplete="new-password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Password"
                                    className="rounded-lg border border-input bg-background px-3 py-2.5 font-mono text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                />
                                <input
                                    required
                                    type="text"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Confirm password"
                                    className="rounded-lg border border-input bg-background px-3 py-2.5 font-mono text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                />
                            </div>
                            <ul className="mt-3 grid gap-1 text-[12px] sm:grid-cols-2">
                                {rules.map((rule) => (
                                    <li
                                        key={rule.key}
                                        className={checks[rule.key] ? "text-[#006c49] dark:text-[#6ffbbe]" : "text-muted-foreground"}
                                    >
                                        {checks[rule.key] ? "✓" : "○"} {rule.label}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <Button type="submit" className="w-full" disabled={saving}>
                            {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
                            Create account
                        </Button>
                    </form>
                )}
            </div>
        </div>
    );
}
