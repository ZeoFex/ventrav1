import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export type BusinessProfile = {
    id: string;
    name: string;
    slug: string;
    businessType: string | null;
    contactEmail: string | null;
    phone: string | null;
    address: string | null;
    city: string | null;
    region: string | null;
    currency: string;
    taxType: string;
    taxRate: string;
    taxRegistered: boolean;
    logoUrl: string | null;
    receiptHeader: string | null;
    receiptFooter: string | null;
};

export function useBusinessProfile() {
    const { data, error, mutate } = useSWR<BusinessProfile>("/api/business", fetcher);
    return {
        business: data,
        isLoading: !error && !data,
        isError: error,
        mutate,
    };
}
