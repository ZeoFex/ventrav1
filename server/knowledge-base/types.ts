/** Knowledge base domain types — articles live under `content/knowledge-base/articles`. */

export interface KbCategoryConfig {
    id: string;
    label: string;
    order: number;
}

export interface KbArticleMeta {
    title: string;
    slug: string;
    category: string;
    excerpt: string;
    order: number;
}

export interface KbArticleLoaded extends KbArticleMeta {
    /** Markdown body (no YAML frontmatter). */
    bodyMarkdown: string;
    /** ISO8601 timestamp for Last updated display. */
    updatedAtIso: string;
}

export interface PopularFaqJson {
    items: PopularFaqItem[];
}

export interface PopularFaqItem {
    question: string;
    answer: string;
    /** When set, UI may link “Read guide” to `/help/[slug]`. */
    slug?: string;
}
