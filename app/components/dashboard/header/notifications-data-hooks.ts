import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export type NotificationIcon = "package" | "receipt" | "settings" | "info" | "alert";

export type Notification = {
    id: string;
    businessId: string;
    branchId: string | null;
    title: string;
    body: string;
    icon: NotificationIcon;
    isRead: boolean;
    createdAt: string;
};

export function useNotifications() {
    const { data, error, mutate } = useSWR<Notification[]>("/api/notifications", fetcher, {
        refreshInterval: 60000, // Refresh every minute
    });
    return {
        notifications: Array.isArray(data) ? data : [],
        isLoading: !error && !data,
        isError: !!error || (data && !Array.isArray(data)),
        mutate,
    };
}
