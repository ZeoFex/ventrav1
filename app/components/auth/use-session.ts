import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export type SessionUser = {
    id: string;
    name: string;
    businessId: string;
    role: string;
    branchId?: string; // If present, user is locked to this branch
    email: string;
    avatarUrl?: string | null;
    permissions: string[];
    plan: "starter" | "growth" | "pro";
    subscriptionStatus: "active" | "past_due" | "canceled";
    currentPeriodEnd: string | null;
    businessType?: string | null;
};

export function useSession() {
    const { data, error, isLoading, mutate } = useSWR<{ user: SessionUser | null }>(
        "/api/auth/session",
        fetcher,
        {
            revalidateOnFocus: false,
            shouldRetryOnError: false,
        }
    );

    return {
        user: data?.user || null,
        isLoading,
        isError: error,
        mutate,
    };
}
