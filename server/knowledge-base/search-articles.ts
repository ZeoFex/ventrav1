import type { KbArticleLoaded, KbArticleMeta } from "./types";

function normalizeQuery(raw: string): string[] {
    return raw
        .toLowerCase()
        .split(/[^a-z0-9]+/i)
        .map((t) => t.trim())
        .filter((t) => t.length > 1);
}

/**
 * Simple token overlap score over title + excerpt + body preview (first 4000 chars for perf).
 */
export function searchKbArticles(
    articles: readonly KbArticleLoaded[],
    query: string,
    limit = 20
): KbArticleMeta[] {
    const tokens = normalizeQuery(query);
    if (tokens.length === 0) {
        return [];
    }

    const scored = articles.map((a) => {
        const hay = `${a.title} ${a.excerpt} ${a.bodyMarkdown.slice(0, 4000)}`.toLowerCase();
        let score = 0;
        for (const t of tokens) {
            if (hay.includes(t)) {
                score += 3;
                if (a.title.toLowerCase().includes(t)) score += 4;
                if (a.excerpt.toLowerCase().includes(t)) score += 2;
            }
        }
        return { a, score };
    });

    scored.sort((x, y) => y.score - x.score || x.a.title.localeCompare(y.a.title));
    const out: KbArticleMeta[] = [];
    for (const { a, score } of scored) {
        if (score <= 0) break;
        if (out.length >= limit) break;
        out.push({
            title: a.title,
            slug: a.slug,
            category: a.category,
            excerpt: a.excerpt,
            order: a.order,
        });
        if (out.length >= limit) break;
    }
    return out;
}
