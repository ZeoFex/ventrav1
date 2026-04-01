import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

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
    startDate: string | null;
    endDate: string | null;
    createdAt: string;
};

export function useDiscounts() {
    const { data, error, mutate } = useSWR<Discount[]>("/api/discounts", fetcher);
    return {
        discounts: data,
        isLoading: !error && !data,
        isError: error,
        mutate,
    };
}
