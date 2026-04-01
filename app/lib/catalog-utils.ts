export function formatGhs(n: number): string {
    return new Intl.NumberFormat("en-GH", {
        style: "currency",
        currency: "GHS",
        minimumFractionDigits: 2,
    }).format(n);
}

export function generateSlug(name: string): string {
    return name.toLowerCase().replace(/\s+/g, "-");
}

export function getCategoryName(categories: any[], id: string) {
    return categories.find((c) => c.id === id)?.name || "Uncategorized";
}

export function getTagNames(tags: any[], ids: string[]) {
    return ids.map((id) => tags.find((t) => t.id === id)?.name).filter(Boolean);
}
