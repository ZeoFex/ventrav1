"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Copy, Check, KeyRound, Play, ChevronRight, BookMarked } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
    defaultSandboxPath,
    platformSections,
    sandboxPresets,
    type PlatformSection,
} from "./content";

const KEY_STORAGE = "ventra_platform_docs_key";

function CopyBtn({ text, className }: { text: string; className?: string }) {
    const [done, setDone] = useState(false);
    return (
        <button
            type="button"
            onClick={async () => {
                try {
                    await navigator.clipboard.writeText(text);
                    setDone(true);
                    setTimeout(() => setDone(false), 2000);
                } catch {
                    /* ignore */
                }
            }}
            className={cn(
                "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border/80 bg-background/80 text-muted-foreground transition hover:border-border hover:text-foreground",
                className
            )}
            title="Copy"
        >
            {done ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
    );
}

function methodPillClass(m: string): string {
    switch (m) {
        case "GET":
            return "text-emerald-600 dark:text-emerald-400/90";
        case "POST":
            return "text-sky-600 dark:text-sky-400/90";
        case "PATCH":
            return "text-violet-600 dark:text-violet-400/90";
        case "DELETE":
            return "text-rose-600 dark:text-rose-400/90";
        default:
            return "text-muted-foreground";
    }
}

function EndpointTable({
    items,
    baseUrl,
}: {
    items: PlatformSection["endpoints"];
    baseUrl: string;
}) {
    if (items.length === 0) {
        return null;
    }
    const origin = (
        baseUrl || (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000")
    ).replace(/\/$/, "");
    return (
        <div className="mt-4 overflow-x-auto rounded-xl border border-border/60 bg-card/30">
            <table className="w-full min-w-[32rem] text-left text-sm">
                <thead>
                    <tr className="border-b border-border/60 bg-muted/30 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        <th className="px-4 py-3">Use case</th>
                        <th className="px-4 py-3">Request</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                    {items.map((row) => {
                        const isApiPath = row.path.startsWith("/api");
                        const isHttp = ["GET", "POST", "PATCH", "DELETE"].includes(row.method) && isApiPath;
                        const fullUrl = isHttp ? `${origin}${row.path}` : row.path;
                        const copyText = isHttp ? `${row.method} ${fullUrl}` : fullUrl;
                        return (
                            <tr key={`${row.method}-${row.path}-${row.label}`} className="align-top">
                                <td className="px-4 py-3.5 text-foreground/95">
                                    <div className="font-medium text-foreground">{row.label}</div>
                                    {row.note ? (
                                        <p className="mt-1.5 whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
                                            {row.note}
                                        </p>
                                    ) : null}
                                </td>
                                <td className="px-4 py-3.5">
                                    <div className="flex items-start gap-2">
                                        <code className="block grow break-all rounded-md bg-muted/60 px-2.5 py-2 text-[13px] leading-snug text-foreground">
                                            {isHttp ? (
                                                <>
                                                    <span className={methodPillClass(row.method)}>{row.method}</span>{" "}
                                                    {fullUrl}
                                                </>
                                            ) : (
                                                <>
                                                    <span className="text-muted-foreground">[{row.method}]</span> {fullUrl}
                                                </>
                                            )}
                                        </code>
                                        <CopyBtn text={copyText} />
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

const SANDBOX_TIMEOUT_MS = 60_000;

/** Same app → relative path so localhost vs 127.0.0.1 does not break CORS. */
function resolveSandboxRequestUrl(pathValue: string, base: string): string {
    const raw = pathValue.trim();
    if (raw.startsWith("http://") || raw.startsWith("https://")) {
        return raw;
    }
    const pathPart = raw.startsWith("/") ? raw : `/${raw}`;
    if (typeof window === "undefined") {
        return `${(base || "http://localhost:3000").replace(/\/$/, "")}${pathPart}`;
    }
    const origin = (base || window.location.origin).replace(/\/$/, "");
    if (origin === window.location.origin) {
        return pathPart;
    }
    return `${origin}${pathPart}`;
}

function sameOriginPathForTryApi(resolved: string, pageOrigin: string): string {
    if (resolved.startsWith("http://") || resolved.startsWith("https://")) {
        const u = new URL(resolved);
        if (u.origin !== pageOrigin) {
            return "";
        }
        return `${u.pathname}${u.search}`;
    }
    return resolved;
}

export function SuperadminDocsClient() {
    const [baseUrl, setBaseUrl] = useState("");
    const [platformKey, setPlatformKey] = useState("");
    const [path, setPath] = useState(defaultSandboxPath);
    const [loading, setLoading] = useState(false);
    const [resText, setResText] = useState<string | null>(null);
    const [resError, setResError] = useState<string | null>(null);

    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }
        setBaseUrl(window.location.origin);
        try {
            const s = sessionStorage.getItem(KEY_STORAGE);
            if (s) {
                setPlatformKey(s);
            }
        } catch {
            /* private mode */
        }
    }, []);

    const saveKey = useCallback(() => {
        try {
            if (platformKey) {
                sessionStorage.setItem(KEY_STORAGE, platformKey);
            } else {
                sessionStorage.removeItem(KEY_STORAGE);
            }
        } catch {
            /* ignore */
        }
    }, [platformKey]);

    const runSandbox = useCallback(async () => {
        setResError(null);
        setResText(null);
        if (!platformKey.trim()) {
            setResError("Paste a platform key first (from your VENTRA_PLATFORM_API_KEYS, or your lead).");
            return;
        }
        if (typeof window === "undefined") {
            return;
        }
        setLoading(true);
        const resolved = resolveSandboxRequestUrl(path, baseUrl);
        const forTry = sameOriginPathForTryApi(resolved, window.location.origin);
        const useProxy = forTry.length > 0 && forTry.startsWith("/api/platform/");
        const ac = new AbortController();
        const t = setTimeout(() => ac.abort(), SANDBOX_TIMEOUT_MS);
        const pk = platformKey.trim();
        try {
            const r = useProxy
                ? await fetch("/api/superadmin-docs/try", {
                      method: "POST",
                      cache: "no-store",
                      signal: ac.signal,
                      headers: {
                          "Content-Type": "application/json",
                          "X-Ventra-Platform-Key": pk,
                      },
                      body: JSON.stringify({ path: forTry }),
                  })
                : await fetch(resolved, {
                      method: "GET",
                      cache: "no-store",
                      signal: ac.signal,
                      headers: { "X-Ventra-Platform-Key": pk },
                  });
            const body = await r.text();
            setResText(`${r.status} ${r.statusText}\n\n${body}`);
            if (!r.ok) {
                setResError("Non-2xx — see body above.");
            }
        } catch (e) {
            const isAbort = e && typeof e === "object" && (e as { name?: string }).name === "AbortError";
            if (isAbort) {
                setResError(
                    `Request timed out after ${SANDBOX_TIMEOUT_MS / 1000}s. The server may be cold-starting or the route is slow. Check the path and that the dev server is running.`
                );
            } else {
                setResError(e instanceof Error ? e.message : "Request failed (network or CORS).");
            }
        } finally {
            clearTimeout(t);
            setLoading(false);
        }
    }, [baseUrl, path, platformKey]);

    const toc = useMemo(
        () =>
            platformSections
                .filter((s) => s.endpoints.length > 0 || s.description.length > 0)
                .map((s) => s.id),
        []
    );

    return (
        <div className="mx-auto w-full max-w-6xl px-4 pb-20 pt-6 sm:px-6">
            <div className="mb-10 border-b border-border/60 pb-8">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600/90 dark:text-emerald-400/90">
                    Platform
                </p>
                <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight sm:text-4xl">
                    Superadmin API
                </h1>
                <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
                    For engineers building the cross-tenant dashboard. Use{" "}
                    <code className="rounded bg-muted/80 px-1.5 py-0.5 text-sm">X-Ventra-Platform-Key</code> (not
                    end-user login). Most tables are <span className="text-emerald-600 dark:text-emerald-400/90">GET</span>{" "}
                    <code className="rounded bg-muted/80 px-1.5 py-0.5 text-sm">/api/platform/…</code>; user and
                    business updates use the same key — see <em>Writes</em> below. Start with{" "}
                    <code className="rounded bg-muted/80 px-1.5 py-0.5 text-sm">/api/platform/overview</code>.
                </p>
            </div>

            <div className="mb-6 flex flex-wrap gap-1.5 lg:hidden">
                <span className="w-full pl-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Jump
                </span>
                <a
                    href="#sandbox"
                    className="rounded-full border border-border/70 bg-card/40 px-2.5 py-1 text-xs text-muted-foreground transition hover:border-border hover:text-foreground"
                >
                    Sandbox
                </a>
                {platformSections.map((s) => (
                    <a
                        key={s.id}
                        href={`#${s.id}`}
                        className="rounded-full border border-border/70 bg-card/40 px-2.5 py-1 text-xs text-muted-foreground transition hover:border-border hover:text-foreground"
                    >
                        {s.id === "open" ? "OpenAPI" : s.title}
                    </a>
                ))}
            </div>

            <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_220px]">
                <div className="min-w-0 space-y-12">
                    {/* Sandbox */}
                    <section
                        id="sandbox"
                        className="relative overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br from-zinc-50/90 via-white to-zinc-50/80 p-6 shadow-sm dark:from-zinc-900/50 dark:via-zinc-950/80 dark:to-zinc-900/30"
                    >
                        <div className="mb-4 flex items-center gap-2 text-foreground">
                            <Play className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                            <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">Sandbox</h2>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Paste the key you were given (same value as in{" "}
                            <code className="rounded bg-muted/70 px-1 py-0.5">VENTRA_PLATFORM_API_KEYS</code>). It
                            stays only in this browser tab via session storage. Never commit it. The sandbox only runs{" "}
                            <strong>GET</strong> — use your HTTP client (or OpenAPI) for{" "}
                            <span className="whitespace-nowrap">POST / PATCH / DELETE</span>.
                        </p>
                        <div className="mt-5 space-y-4">
                            <div>
                                <label className="text-xs font-medium text-muted-foreground" htmlFor="pl-base">
                                    Base URL
                                </label>
                                <input
                                    id="pl-base"
                                    className="mt-1.5 w-full rounded-lg border border-border/80 bg-background px-3 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-emerald-500/40"
                                    value={baseUrl}
                                    onChange={(e) => setBaseUrl(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-muted-foreground" htmlFor="pl-key">
                                    X-Ventra-Platform-Key
                                </label>
                                <div className="mt-1.5 flex gap-2">
                                    <input
                                        id="pl-key"
                                        type="password"
                                        autoComplete="off"
                                        className="min-w-0 grow rounded-lg border border-border/80 bg-background px-3 py-2 font-mono text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-emerald-500/40"
                                        value={platformKey}
                                        onChange={(e) => setPlatformKey(e.target.value)}
                                        placeholder="Paste key here"
                                    />
                                    <Button type="button" variant="secondary" onClick={saveKey}>
                                        <KeyRound className="mr-1.5 h-4 w-4" />
                                        Save
                                    </Button>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-muted-foreground" htmlFor="pl-path">
                                    Path
                                </label>
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                    {sandboxPresets.map((p) => (
                                        <button
                                            key={p.path}
                                            type="button"
                                            onClick={() => setPath(p.path)}
                                            className="rounded-full border border-border/70 bg-background/80 px-2.5 py-1 text-xs text-muted-foreground transition hover:border-emerald-500/40 hover:text-foreground"
                                        >
                                            {p.label}
                                        </button>
                                    ))}
                                </div>
                                <div className="mt-1.5 flex flex-wrap gap-2 sm:flex-nowrap">
                                    <input
                                        id="pl-path"
                                        className="min-w-0 grow rounded-lg border border-border/80 bg-background px-3 py-2 font-mono text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-emerald-500/40"
                                        value={path}
                                        onChange={(e) => setPath(e.target.value)}
                                    />
                                    <Button
                                        type="button"
                                        onClick={runSandbox}
                                        disabled={loading}
                                        className="shrink-0 bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
                                    >
                                        {loading ? "…" : "Run GET"}
                                    </Button>
                                </div>
                            </div>
                        </div>
                        {(resText || resError) && (
                            <pre
                                className={cn(
                                    "mt-4 max-h-[min(50vh,28rem)] overflow-auto rounded-xl border p-4 text-left text-xs leading-relaxed",
                                    resError
                                        ? "border-amber-500/30 bg-amber-50/50 text-amber-950 dark:border-amber-500/20 dark:bg-amber-950/20 dark:text-amber-100"
                                        : "border-border/60 bg-muted/40 text-foreground"
                                )}
                            >
                                {resError ? `${resError}\n\n` : ""}
                                {resText ?? ""}
                            </pre>
                        )}
                    </section>

                    {platformSections.map((section) => (
                        <section
                            key={section.id}
                            id={section.id}
                            className="scroll-mt-28 rounded-2xl border border-border/50 bg-card/20 p-5 shadow-sm sm:p-6"
                        >
                            <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight text-foreground">
                                {section.title}
                            </h2>
                            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
                                {section.description}
                            </p>
                            <EndpointTable items={section.endpoints} baseUrl={baseUrl} />
                        </section>
                    ))}
                </div>

                <aside className="hidden lg:block">
                    <div className="sticky top-28 space-y-3 rounded-2xl border border-border/60 bg-card/50 p-4 text-sm">
                        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            <BookMarked className="h-3.5 w-3.5" />
                            On this page
                        </p>
                        <a
                            href="#sandbox"
                            className="block rounded-md px-2 py-1.5 text-foreground/90 transition hover:bg-muted/80"
                        >
                            Sandbox
                        </a>
                        {toc.map((id) => {
                            const s = platformSections.find((x) => x.id === id);
                            if (!s) {
                                return null;
                            }
                            return (
                                <a
                                    key={id}
                                    href={`#${id}`}
                                    className="flex items-center gap-0.5 rounded-md px-2 py-1.5 text-muted-foreground transition hover:bg-muted/80 hover:text-foreground"
                                >
                                    <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-50" />
                                    {s.title}
                                </a>
                            );
                        })}
                        <div className="mt-4 border-t border-border/60 pt-4">
                            <Link
                                href="/api-reference"
                                className="text-xs font-medium text-emerald-700 underline-offset-4 hover:underline dark:text-emerald-400/90"
                            >
                                Full API reference (OpenAPI) →
                            </Link>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
}
