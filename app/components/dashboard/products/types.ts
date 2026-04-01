export type ProductStatus = "active" | "archived";

export interface ProductRow {
    id: string;
    name: string;
    sku: string;
    categoryId: string | null;
    tagIds: string[];
    priceGhs: number | string;
    stock: number;
    reorderAt: number;
    status: ProductStatus;
    description?: string;
    imageSrc?: string | null;
    slug?: string;
    variations?: ProductVariation[];
}

export interface ProductVariation {
    id?: string;
    productId?: string;
    name: string;
    type: string;
    priceGhs?: number | string;
    stock: number;
    sku?: string;
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
