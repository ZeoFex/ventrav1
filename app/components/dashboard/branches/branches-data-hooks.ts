import useSWR from "swr";

const EMPTY_BRANCHES: never[] = [];

async function branchesFetcher(url: string) {
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok) {
        return [];
    }
    return Array.isArray(data) ? data : [];
}

export function useBranches() {
    const { data, error, mutate } = useSWR("/api/branches", branchesFetcher);

    return {
        branches: data ?? EMPTY_BRANCHES,
        isLoading: !error && data === undefined,
        isError: error,
        mutate,
    };
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useBranch(id: string | null) {
    const { data, error, mutate } = useSWR(id ? `/api/branches/${id}` : null, fetcher);

    return {
        branch: data,
        isLoading: id && !error && !data,
        isError: error,
        mutate,
    };
}
