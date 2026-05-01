import { cache } from "react";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import type {
    KbArticleLoaded,
    KbArticleMeta,
    KbCategoryConfig,
    PopularFaqItem,
    PopularFaqJson,
} from "./types";
import { searchKbArticles } from "./search-articles";

function kbRoot(): string {
    return path.join(process.cwd(), "content", "knowledge-base");
}

function articlesDir(): string {
    return path.join(kbRoot(), "articles");
}

function isRecord(v: unknown): v is Record<string, unknown> {
    return typeof v === "object" && v !== null && !Array.isArray(v);
}

function coerceFrontmatter(raw: Record<string, unknown>): {
    title: string;
    slug: string;
    category: string;
    excerpt: string;
    order: number;
    updated?: string;
} {
    const title = typeof raw.title === "string" ? raw.title.trim() : "";
    const slug = typeof raw.slug === "string" ? raw.slug.trim() : "";
    const category = typeof raw.category === "string" ? raw.category.trim() : "";
    const excerpt = typeof raw.excerpt === "string" ? raw.excerpt.trim() : "";
    const orderRaw = raw.order;
    const order =
        typeof orderRaw === "number"
            ? orderRaw
            : typeof orderRaw === "string"
              ? Number.parseInt(orderRaw, 10) || 0
              : 0;
    const updated = typeof raw.updated === "string" ? raw.updated.trim() : undefined;
    if (!title || !slug || !category || !excerpt) {
        throw new Error(
            `[knowledge-base] Article frontmatter missing title/slug/category/excerpt (slug="${slug}")`
        );
    }
    return { title, slug, category, excerpt, order, updated };
}

export const getKbCategories = cache((): KbCategoryConfig[] => {
    const p = path.join(kbRoot(), "categories.json");
    const raw = JSON.parse(fs.readFileSync(p, "utf8")) as { categories?: KbCategoryConfig[] };
    const list = Array.isArray(raw.categories) ? raw.categories : [];
    return [...list].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
});

export const getPopularFaqItems = cache((): PopularFaqItem[] => {
    const p = path.join(kbRoot(), "faq", "popular.json");
    const raw = JSON.parse(fs.readFileSync(p, "utf8")) as PopularFaqJson;
    return Array.isArray(raw.items) ? raw.items : [];
});

const loadAllKbArticlesUncached = (): KbArticleLoaded[] => {
    const dir = articlesDir();
    if (!fs.existsSync(dir)) {
        return [];
    }
    const files = fs.readdirSync(dir).filter((f) => f.endsWith(".md"));
    const loaded: KbArticleLoaded[] = [];

    for (const file of files) {
        const fp = path.join(dir, file);
        const rawFile = fs.readFileSync(fp, "utf8");
        const parsed = matter(rawFile);
        if (!isRecord(parsed.data)) {
            throw new Error(`[knowledge-base] Invalid frontmatter in ${file}`);
        }
        const fm = coerceFrontmatter(parsed.data);
        const stat = fs.statSync(fp);
        const fromFile = stat.mtime.toISOString();
        const updatedIso = fm.updated && fm.updated.length > 0 ? fm.updated : fromFile;
        loaded.push({
            title: fm.title,
            slug: fm.slug,
            category: fm.category,
            excerpt: fm.excerpt,
            order: fm.order,
            bodyMarkdown: String(parsed.content).trim(),
            updatedAtIso: updatedIso,
        });
    }

    const cats = getKbCategories();
    const rank = new Map(cats.map((c, i) => [c.id, i]));

    loaded.sort((a, b) => {
        const ra = rank.get(a.category) ?? 999;
        const rb = rank.get(b.category) ?? 999;
        if (ra !== rb) return ra - rb;
        if (a.order !== b.order) return a.order - b.order;
        return a.title.localeCompare(b.title);
    });

    const slugs = new Set<string>();
    for (const row of loaded) {
        if (slugs.has(row.slug)) {
            throw new Error(`[knowledge-base] Duplicate slug: ${row.slug}`);
        }
        slugs.add(row.slug);
        const catOk = cats.some((c) => c.id === row.category);
        if (!catOk) {
            console.warn(`[knowledge-base] Unknown category "${row.category}" on ${row.slug}`);
        }
    }

    return loaded;
};

/** Cached filesystem scan — call from RSC, route handlers (Node runtime), generateStaticParams. */
export const getAllKbArticles = cache(loadAllKbArticlesUncached);

export function getAllKbArticleMeta(): KbArticleMeta[] {
    return getAllKbArticles().map((a) => ({
        title: a.title,
        slug: a.slug,
        category: a.category,
        excerpt: a.excerpt,
        order: a.order,
    }));
}

export function getKbArticleBySlug(slug: string): KbArticleLoaded | null {
    const s = slug.trim();
    return getAllKbArticles().find((a) => a.slug === s) ?? null;
}

export function kbSearchMeta(query: string, limit?: number): KbArticleMeta[] {
    return searchKbArticles(getAllKbArticles(), query, limit);
}

export function getKbSlugs(): string[] {
    return getAllKbArticles().map((a) => a.slug);
}
