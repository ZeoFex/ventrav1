/** Coerce catalog/POS stock values. Empty, null, and NaN become 0. */
export function toStockQty(value: unknown): number {
    if (typeof value === "number") {
        return Number.isFinite(value) ? value : 0;
    }
    if (value == null || value === "") return 0;
    const n = Number(String(value).replace(/,/g, "").trim());
    return Number.isFinite(n) ? n : 0;
}

/** Physical on-hand minus layaway reservations. May be negative when oversold. */
export function onHandUnits(stock: unknown, stockReserved: unknown = 0): number {
    return toStockQty(stock) - toStockQty(stockReserved);
}

/** Units that can still be sold without going further into the red. Floor at 0. */
export function sellableUnits(stock: unknown, stockReserved: unknown = 0): number {
    return Math.max(0, onHandUnits(stock, stockReserved));
}

/**
 * Bulk import often stores qty on the parent product and creates variations
 * with 0 stock. Inventory then lives on the parent, not the empty variations.
 */
export function inventoryLivesOnParent(variationStocks: unknown[]): boolean {
    if (variationStocks.length === 0) return true;
    return variationStocks.reduce<number>((sum, stock) => sum + toStockQty(stock), 0) <= 0;
}
