import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { getAllKbArticleMeta, getKbCategories } from "@/server/knowledge-base";
import { HelpSearchPanel } from "./help-search-panel";

export const metadata: Metadata = {
    title: "Help Centre",
    description:
        "Merchant guides for VentraPOS — POS, inventory, staff, billing, reports, and troubleshooting.",
};

export default async function HelpCentrePage({
    searchParams,
}: {
    searchParams?: Promise<{ category?: string }>;
}) {
    const sp = (await searchParams) ?? {};
    const filterCat = sp.category?.trim() || undefined;
    const categories = getKbCategories();
    const meta = getAllKbArticleMeta();
    const grouped = categories.map((c) => ({
        ...c,
        articles: meta.filter((a) => a.category === c.id),
    }));

    return (
        <main className="mx-auto max-w-4xl px-4 pb-24 pt-10 sm:px-6 lg:max-w-5xl lg:pt-14">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#006c49] dark:text-[#6ffbbe]">
                Help Centre
            </p>
            <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl font-bold tracking-tight sm:text-[2.65rem] sm:leading-tight">
                How can we help?
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
                Practical guides for running your shop on VentraPOS. Search below or browse by topic.
            </p>

            <div className="mt-10 max-w-2xl">
                <HelpSearchPanel categoryId={filterCat} />
            </div>

            <nav className="mt-12 flex flex-wrap gap-2" aria-label="Browse by category">
                <CategoryPill active={!filterCat} href="/help">
                    All topics
                </CategoryPill>
                {categories.map((c) => (
                    <CategoryPill
                        key={c.id}
                        active={filterCat === c.id}
                        href={`/help?category=${encodeURIComponent(c.id)}`}
                    >
                        {c.label}
                    </CategoryPill>
                ))}
            </nav>

            <div className="mt-14 space-y-16">
                {grouped.map((group) => {
                    if (filterCat && filterCat !== group.id) return null;
                    if (group.articles.length === 0) return null;
                    return (
                        <section key={group.id} id={`category-${group.id}`}>
                            <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight">
                                {group.label}
                            </h2>
                            <ul className="mt-6 divide-y divide-border rounded-2xl border border-border bg-card dark:bg-[#111]">
                                {group.articles.map((a) => (
                                    <li key={a.slug}>
                                        <Link
                                            href={`/help/${a.slug}`}
                                            className="block px-5 py-4 transition-colors hover:bg-muted/60"
                                        >
                                            <span className="text-[15px] font-semibold text-foreground">{a.title}</span>
                                            <p className="mt-1 text-[14px] text-muted-foreground">{a.excerpt}</p>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    );
                })}
            </div>

            <p className="mt-16 rounded-2xl border border-border bg-muted/25 px-5 py-4 text-[14px] text-muted-foreground">
                Logged in? Open{" "}
                <Link
                    href="/dashboard/support"
                    className="font-medium text-[#006c49] underline-offset-4 hover:underline dark:text-[#6ffbbe]"
                >
                    Dashboard → Support
                </Link>{" "}
                for quick search inside your workspace too.
            </p>
        </main>
    );
}

function CategoryPill({
    href,
    active,
    children,
}: {
    href: string;
    active: boolean;
    children: ReactNode;
}) {
    return (
        <Link
            href={href}
            className={`rounded-full border px-4 py-2 text-[13px] font-medium transition-colors ${
                active
                    ? "border-[#006c49]/50 bg-[#006c49]/10 text-[#006c49] dark:border-[#6ffbbe]/40 dark:bg-[#6ffbbe]/10 dark:text-[#6ffbbe]"
                    : "border-border text-muted-foreground hover:border-[#006c49]/35 hover:text-foreground dark:hover:border-[#6ffbbe]/35"
            }`}
        >
            {children}
        </Link>
    );
}
