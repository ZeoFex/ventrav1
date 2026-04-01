import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export type BusinessConfig = {
    id: string;
    name: string;
    currency: string;
    taxType: string;
    taxRate: string;
    receiptHeader: string | null;
    receiptFooter: string | null;
};

export function usePosConfig() {
    const { data, error, mutate } = useSWR<BusinessConfig>("/api/pos/config", fetcher);
    return {
        config: data,
        isLoading: !error && !data,
        isError: error,
        mutate,
    };
}
