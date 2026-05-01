import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getKbArticleBySlug, getKbCategories, getKbSlugs } from "@/server/knowledge-base";
import { HelpMarkdown } from "../help-markdown";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
    return getKbSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;
    const article = getKbArticleBySlug(slug);
    if (!article) {
        return { title: "Article not found" };
    }
    return {
        title: article.title,
        description: article.excerpt,
    };
}

export default async function HelpArticlePage({ params }: Props) {
    const { slug } = await params;
    const article = getKbArticleBySlug(slug);
    if (!article) {
        notFound();
    }
    const categories = getKbCategories();
    const catLabel = categories.find((c) => c.id === article.category)?.label ?? article.category;
    const updated = new Intl.DateTimeFormat("en-GH", { dateStyle: "medium" }).format(
        new Date(article.updatedAtIso)
    );

    return (
        <article className="mx-auto max-w-3xl px-4 pb-24 pt-10 sm:px-6 lg:pt-14">
            <nav className="text-[13px] text-muted-foreground">
                <Link href="/help" className="hover:text-foreground hover:underline">
                    Help Centre
                </Link>
                <span className="mx-2">/</span>
                <span className="text-foreground">{catLabel}</span>
            </nav>
            <h1 className="mt-4 font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight sm:text-[2.35rem] sm:leading-tight">
                {article.title}
            </h1>
            <p className="mt-2 text-[14px] text-muted-foreground">
                Updated {updated} · {catLabel}
            </p>
            <div className="mt-10">
                <HelpMarkdown content={article.bodyMarkdown} />
            </div>
            <div className="mt-12 border-t border-border pt-8">
                <Link
                    href={`/help?category=${encodeURIComponent(article.category)}`}
                    className="text-[14px] font-medium text-[#006c49] underline-offset-4 hover:underline dark:text-[#6ffbbe]"
                >
                    More in {catLabel}
                </Link>
            </div>
        </article>
    );
}
