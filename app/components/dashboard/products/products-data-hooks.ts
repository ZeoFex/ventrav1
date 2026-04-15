import useSWR from "swr";
import { useBranchContext } from "../branch-context";
import {
    cacheProducts,
    getCachedProducts,
    cacheCategories,
    getCachedCategories,
    cacheProduct,
    type Product,
} from "@/app/lib/offline/offline-db";

/**
 * Offline-aware fetcher: network first; cache successful list/detail responses.
 * IndexedDB fallback is used only when the browser is offline — not on random
 * HTTP errors while online (avoids showing stale catalog/stock after saves).
 */
function createOfflineFetcher(cacheKey: "products" | "categories") {
    return async (url: string) => {
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();

            if (cacheKey === "products") {
                if (Array.isArray(data)) {
                    cacheProducts(data as Product[]).catch(() => {});
                } else if (
                    data &&
                    typeof data === "object" &&
                    "id" in data &&
                    typeof (data as { id: unknown }).id === "string"
                ) {
                    cacheProduct(data as Product).catch(() => {});
                }
            } else {
                cacheCategories(data).catch(() => {});
            }

            return data;
        } catch (err) {
            const offline = typeof navigator !== "undefined" && !navigator.onLine;
            if (!offline) {
                throw err;
            }

            const cached =
                cacheKey === "products"
                    ? await getCachedProducts()
                    : await getCachedCategories();

            if (cached && cached.length > 0) {
                return cached;
            }

            throw err;
        }
    };
}

const productsFetcher = createOfflineFetcher("products");
const categoriesFetcher = createOfflineFetcher("categories");
const tagsFetcher = (url: string) => fetch(url).then((res) => res.json());

export function useProducts(enabled = true) {
    const { branchId } = useBranchContext();
    const { data, error, mutate } = useSWR(
        enabled ? `/api/products?b=${branchId}` : null,
        productsFetcher,
    );
    return {
        products: data,
        isLoading: enabled && !error && !data,
        isError: error,
        mutate,
    };
}

export function useCategories() {
    const { branchId } = useBranchContext();
    const { data, error, mutate } = useSWR(
        `/api/products/categories?b=${branchId}`,
        categoriesFetcher,
    );
    return {
        categories: data,
        isLoading: !error && !data,
        isError: error,
        mutate,
    };
}

export function useTags() {
    const { branchId } = useBranchContext();
    const { data, error, mutate } = useSWR(`/api/products/tags?b=${branchId}`, tagsFetcher);
    return {
        tags: data,
        isLoading: !error && !data,
        isError: error,
        mutate,
    };
}

export function useProduct(id: string) {
    const { data, error, mutate } = useSWR(id ? `/api/products/${id}` : null, productsFetcher);
    return {
        product: data,
        isLoading: !error && !data,
        isError: error,
        mutate,
    };
}
