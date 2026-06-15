const STORAGE_KEY = "ventrapos-my-reviews";

type StoredReviews = Record<string, string>;

function readStore(): StoredReviews {
    if (typeof window === "undefined") return {};
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw) as unknown;
        if (!parsed || typeof parsed !== "object") return {};
        return parsed as StoredReviews;
    } catch {
        return {};
    }
}

export function getMyReviewEditToken(reviewId: string): string | null {
    return readStore()[reviewId] ?? null;
}

export function saveMyReviewEditToken(reviewId: string, editToken: string) {
    const store = readStore();
    store[reviewId] = editToken;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function getMyReviewIds(): string[] {
    return Object.keys(readStore());
}
