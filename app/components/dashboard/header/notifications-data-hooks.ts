import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());
const EMPTY_NOTIFICATIONS: Notification[] = [];

export function isOnlineCustomerAlert(title: string) {
    return title === "Someone wants to order" || title === "New shop message";
}

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
    const { data, error, mutate, isLoading } = useSWR<Notification[]>("/api/notifications", fetcher, {
        refreshInterval: 3000,
    });
    return {
        notifications: Array.isArray(data) ? data : EMPTY_NOTIFICATIONS,
        isLoading,
        isError: !!error || (data != null && !Array.isArray(data)),
        mutate,
    };
}
