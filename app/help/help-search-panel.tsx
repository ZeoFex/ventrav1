"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, Loader2 } from "lucide-react";
import type { KbArticleMeta } from "@/server/knowledge-base/types";

type Props = {
    /** When set, limit client-side results to this category id. */
    categoryId?: string;
    className?: string;
};

export function HelpSearchPanel({ categoryId, className }: Props) {
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<KbArticleMeta[]>([]);

    useEffect(() => {
        const q = query.trim();
        if (!q) {
            setResults([]);
            return;
        }
        const ctrl = new AbortController();
        const t = window.setTimeout(() => {
            setLoading(true);
            void (async () => {
                try {
                    const params = new URLSearchParams({ q });
                    const r = await fetch(`/api/help/search?${params}`, {
                        signal: ctrl.signal,
                        cache: "no-store",
                    });
                    const data = (await r.json()) as { results?: KbArticleMeta[] };
                    let list = data.results ?? [];
                    if (categoryId) {
                        list = list.filter((x) => x.category === categoryId);
                    }
                    setResults(list);
                } catch {
                    if (!ctrl.signal.aborted) {
                        setResults([]);
                    }
                } finally {
                    if (!ctrl.signal.aborted) {
                        setLoading(false);
                    }
                }
            })();
        }, 280);
        return () => {
            window.clearTimeout(t);
            ctrl.abort();
        };
    }, [query, categoryId]);

    const showPanel = query.trim().length > 0;

    const ariaStatus = useMemo(() => {
        if (!showPanel) return undefined;
        if (loading) return "Searching…";
        if (results.length === 0) return "No articles matched.";
        return `${results.length} article${results.length === 1 ? "" : "s"} found`;
    }, [loading, results.length, showPanel]);

    return (
        <div className={`relative ${className ?? ""}`}>
            <div className="relative">
                <Search className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
                <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search help articles…"
                    className="h-14 w-full rounded-2xl border border-border bg-card pl-12 pr-4 text-[15px] shadow-sm outline-none ring-[#006c49]/15 focus:border-[#006c49]/35 focus:ring-2 dark:border-white/[0.08] dark:bg-[#111]"
                    aria-label="Search help"
                    aria-describedby="help-search-status"
                    autoComplete="off"
                />
                {loading ? (
                    <Loader2 className="absolute right-4 top-1/2 size-5 -translate-y-1/2 animate-spin text-muted-foreground" />
                ) : null}
            </div>
            <p id="help-search-status" className="sr-only" role="status">
                {ariaStatus}
            </p>
            {showPanel ? (
                <div className="absolute z-20 mt-2 max-h-[min(24rem,50vh)] w-full overflow-y-auto rounded-xl border border-border bg-card py-1 shadow-xl dark:bg-[#111]">
                    {results.length === 0 && !loading ? (
                        <p className="px-4 py-6 text-[14px] text-muted-foreground">No matching articles.</p>
                    ) : null}
                    {results.map((r) => (
                        <Link
                            key={r.slug}
                            href={`/help/${r.slug}`}
                            className="block border-b border-border/50 px-4 py-3 last:border-0 hover:bg-muted/50"
                        >
                            <p className="text-[15px] font-medium text-foreground">{r.title}</p>
                            <p className="mt-1 line-clamp-2 text-[13px] text-muted-foreground">{r.excerpt}</p>
                        </Link>
                    ))}
                </div>
            ) : null}
        </div>
    );
}
