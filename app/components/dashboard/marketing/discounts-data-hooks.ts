import useSWR from "swr";

async function discountsFetcher(url: string): Promise<Discount[]> {
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok) {
        console.warn(`[useDiscounts] ${url} → HTTP ${res.status}`, data);
        return [];
    }
    return Array.isArray(data) ? data : [];
}

export type DiscountType = "percentage" | "fixed";

export type Discount = {
    id: string;
    businessId: string;
    branchId: string | null;
    name: string;
    type: DiscountType;
    value: string; // decimal string
    isActive: boolean;
    autoApply: boolean;
    minOrderValueGhs: string | null; // decimal string
    productIds: string[] | null;
    startDate: string | null;
    endDate: string | null;
    createdAt: string;
};

export function useDiscounts() {
    const { data, error, mutate } = useSWR<Discount[]>("/api/discounts", discountsFetcher);
    return {
        discounts: Array.isArray(data) ? data : [],
        isLoading: !error && data === undefined,
        isError: error,
        mutate,
    };
}
