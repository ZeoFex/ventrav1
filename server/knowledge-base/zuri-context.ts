import { getAllKbArticles } from "./load-articles";
import { searchKbArticles } from "./search-articles";

export type ZuriKbContextResult = {
    /** Text block injected into the LLM system bundle (may be empty). */
    digest: string;
    /** Slugs included in the digest, in rank order. */
    slugs: string[];
    /** True when search returned no articles (e.g. empty/gibberish query). */
    retrievalEmpty: boolean;
};

const DEFAULT_MAX_ARTICLES = 5;
const DEFAULT_MAX_CHARS = 12_000;

/**
 * Rank KB articles by lexical overlap with `query`, then pack full markdown bodies
 * into a bounded string for RAG-style prompting.
 */
export function buildZuriKbContext(
    query: string,
    options?: { maxArticles?: number; maxChars?: number }
): ZuriKbContextResult {
    const maxArticles = options?.maxArticles ?? DEFAULT_MAX_ARTICLES;
    const maxChars = options?.maxChars ?? DEFAULT_MAX_CHARS;

    const articles = getAllKbArticles();
    const rankedMeta = searchKbArticles(articles, query, maxArticles);
    if (rankedMeta.length === 0) {
        return { digest: "", slugs: [], retrievalEmpty: true };
    }

    const bySlug = new Map(articles.map((a) => [a.slug, a]));
    const slugs: string[] = [];
    const chunks: string[] = [];
    let used = 0;
    const budgetPerArticle = Math.max(800, Math.floor(maxChars / rankedMeta.length));

    for (const m of rankedMeta) {
        const full = bySlug.get(m.slug);
        if (!full) continue;
        slugs.push(m.slug);

        const header = `### ${full.title}\nslug: ${full.slug}\ncategory: ${full.category}\nexcerpt: ${full.excerpt}\n\n`;
        const headerLen = header.length;
        const bodyRoom = Math.min(budgetPerArticle, Math.max(0, maxChars - used - headerLen));
        if (bodyRoom < 200) break;

        let body = full.bodyMarkdown.trim();
        if (body.length > bodyRoom) {
            body = `${body.slice(0, bodyRoom)}\n\n[truncated]`;
        }
        const block = `${header}${body}`;
        if (used + block.length > maxChars) break;
        chunks.push(block);
        used += block.length;
    }

    if (chunks.length === 0) {
        return { digest: "", slugs: [], retrievalEmpty: true };
    }

    return {
        digest: `The following excerpts are from the official VentraPOS Help Centre. Prefer them over prior knowledge.\n\n---\n\n${chunks.join("\n\n---\n\n")}`,
        slugs,
        retrievalEmpty: false,
    };
}
