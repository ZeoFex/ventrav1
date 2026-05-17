/** Physical stock minus layaway reservations. */
export function sellableUnits(stock: number, stockReserved = 0): number {
    return Math.max(0, stock - (stockReserved || 0));
}
