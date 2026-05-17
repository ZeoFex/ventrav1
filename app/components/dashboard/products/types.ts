export type ProductStatus = "active" | "archived";

export interface ProductRow {
    id: string;
    name: string;
    sku: string;
    categoryId: string | null;
    tagIds: string[];
    priceGhs: number | string;
    /** Physical on-hand count. */
    stock: number;
    /** Units held for open customer orders (layaway). */
    stockReserved?: number;
    /** Sellable = stock − reserved; prefer for POS limits. */
    stockAvailable?: number;
    reorderAt: number;
    status: ProductStatus;
    description?: string;
    imageSrc?: string | null;
    slug?: string;
    /** Unit of measure (e.g. "piece", "kg", "g", "lb"). Defaults to "piece". */
    unit?: string | null;
    variations?: ProductVariation[];
}

export interface ProductVariation {
    id?: string;
    productId?: string;
    name: string;
    type: string;
    priceGhs?: number | string;
    stock: number;
    stockReserved?: number;
    stockAvailable?: number;
    sku?: string;
    barcode?: string;
}

export interface CategoryRow {
    id: string;
    name: string;
    parentId: string | null;
    productCount?: number;
}

export interface TagRow {
    id: string;
    name: string;
    color: string;
}
