import useSWR from "swr";
import { useBranchContext } from "../branch-context";
import { useOnlineStatus } from "@/app/lib/offline/use-online-status";
import {
    cacheProducts,
    getCachedProducts,
    cacheCategories,
    getCachedCategories,
} from "@/app/lib/offline/offline-db";

/**
 * Offline-aware fetcher: tries network first, caches on success,
 * returns IndexedDB cache on failure.
 */
function createOfflineFetcher(cacheKey: "products" | "categories") {
    return async (url: string) => {
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();

            // Cache the fresh data in IndexedDB
            if (cacheKey === "products") {
                cacheProducts(data).catch(() => {});
            } else {
                cacheCategories(data).catch(() => {});
            }

            return data;
        } catch (err) {
            // Network failed — try IndexedDB cache
            const cached =
                cacheKey === "products"
                    ? await getCachedProducts()
                    : await getCachedCategories();

            if (cached && cached.length > 0) {
                return cached;
            }

            // No cache either — rethrow
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
