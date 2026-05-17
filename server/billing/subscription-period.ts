/** Milliseconds added per calendar day for subscription extensions (same as billing success paths). */
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * New period end after adding days, anchored like Paystack renewal:
 * extend from max(now, existing currentPeriodEnd ?? now).
 */
export function computePeriodEndAfterAddingDays(opts: {
    currentPeriodEnd: Date | null | undefined;
    days: number;
    /** Test hook; defaults to runtime now. */
    now?: Date;
}): Date {
    const nowMs = opts.now?.getTime() ?? Date.now();
    const existingMs = opts.currentPeriodEnd ? opts.currentPeriodEnd.getTime() : nowMs;
    const baseMs = existingMs > nowMs ? existingMs : nowMs;
    return new Date(baseMs + opts.days * MS_PER_DAY);
}
