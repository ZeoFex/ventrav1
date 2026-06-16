/**
 * Product search with relevance-ranked autocomplete.
 * Searches name, SKU, barcode, category, and subcategory.
 */
import { eq, and, or, ilike, sql } from "drizzle-orm";
import { db } from "../db";
import {
    products,
    categories,
    subcategories,
} from "../db/schema/products";

export interface ProductSearchResult {
    id: string;
    name: string;
    sku: string;
    barcode: string | null;
    priceGhs: string;
    stock: number;
    categoryId: string | null;
    categoryName: string | null;
    subcategoryId: string | null;
    subcategoryName: string | null;
    relevance: number;
    matchField: string;
}

function escapeLikePattern(q: string): string {
    return q.replace(/[%_\\]/g, "\\$&");
}

/**
 * Score a match: lower prefix = higher score (lower number = more relevant).
 */
function scoreMatch(
    query: string,
    fields: { value: string | null | undefined; weight: number; label: string }[],
): { score: number; matchField: string } | null {
    const q = query.toLowerCase();
    let best: { score: number; matchField: string } | null = null;

    for (const { value, weight, label } of fields) {
        if (!value) continue;
        const v = value.toLowerCase();
        if (v === q) {
            const score = weight;
            if (!best || score < best.score) best = { score, matchField: label };
        } else if (v.startsWith(q)) {
            const score = weight + 10;
            if (!best || score < best.score) best = { score, matchField: label };
        } else if (v.includes(q)) {
            const score = weight + 50;
            if (!best || score < best.score) best = { score, matchField: label };
        }
    }

    return best;
}

export async function searchProducts(
    businessId: string,
    branchId: string | null | undefined,
    query: string,
    limit = 20,
): Promise<ProductSearchResult[]> {
    const q = query.trim();
    if (q.length === 0) return [];

    const pattern = `%${escapeLikePattern(q)}%`;

    const rows = await db
        .select({
            id: products.id,
            name: products.name,
            sku: products.sku,
            barcode: products.barcode,
            priceGhs: products.priceGhs,
            stock: products.stock,
            categoryId: products.categoryId,
            categoryName: categories.name,
            subcategoryId: products.subcategoryId,
            subcategoryName: subcategories.name,
        })
        .from(products)
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .leftJoin(subcategories, eq(products.subcategoryId, subcategories.id))
        .where(
            and(
                eq(products.businessId, businessId),
                branchId && branchId !== "all"
                    ? eq(products.branchId, branchId)
                    : undefined,
                or(
                    ilike(products.name, pattern),
                    ilike(products.sku, pattern),
                    ilike(products.barcode, pattern),
                    ilike(categories.name, pattern),
                    ilike(subcategories.name, pattern),
                ),
            ),
        )
        .limit(Math.min(limit * 3, 100));

    const qLower = q.toLowerCase();
    const scored = rows
        .map((row) => {
            const match = scoreMatch(qLower, [
                { value: row.name, weight: 1, label: "name" },
                { value: row.sku, weight: 2, label: "sku" },
                { value: row.barcode, weight: 3, label: "barcode" },
                { value: row.categoryName, weight: 20, label: "category" },
                { value: row.subcategoryName, weight: 25, label: "subcategory" },
            ]);

            if (!match) return null;

            return {
                ...row,
                relevance: match.score,
                matchField: match.matchField,
            };
        })
        .filter((r): r is ProductSearchResult => r !== null);

    scored.sort((a, b) => {
        if (a.relevance !== b.relevance) return a.relevance - b.relevance;
        return a.name.localeCompare(b.name);
    });

    return scored.slice(0, limit);
}

/** Search category names for autocomplete (product form). */
export async function searchCategories(
    businessId: string,
    branchId: string | null | undefined,
    query: string,
    limit = 30,
) {
    const q = query.trim();
    const conditions = [eq(categories.businessId, businessId)];

    if (branchId && branchId !== "all") {
        conditions.push(eq(categories.branchId, branchId));
    }

    if (q) {
        conditions.push(ilike(categories.name, `%${escapeLikePattern(q)}%`));
    }

    return db
        .select()
        .from(categories)
        .where(and(...conditions))
        .orderBy(sql`LOWER(${categories.name})`)
        .limit(limit);
}
