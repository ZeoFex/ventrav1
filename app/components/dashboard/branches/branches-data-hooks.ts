import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useBranches() {
    const { data, error, mutate } = useSWR("/api/branches", fetcher);

    return {
        branches: data,
        isLoading: !error && !data,
        isError: error,
        mutate,
    };
}

export function useBranch(id: string | null) {
    const { data, error, mutate } = useSWR(id ? `/api/branches/${id}` : null, fetcher);

    return {
        branch: data,
        isLoading: id && !error && !data,
        isError: error,
        mutate,
    };
}
