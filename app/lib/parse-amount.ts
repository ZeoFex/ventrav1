/**
 * Ghana-style amounts: comma thousands, period decimals.
 * "1,000" → 1000, "1,000.50" → 1000.5
 */

export function parseAmountInput(raw: string | number | null | undefined): number {
    if (typeof raw === "number") return raw;
    const s = String(raw ?? "")
        .trim()
        .replace(/,/g, "");
    if (!s || s === "-" || s === "." || s === "-.") return NaN;
    return Number(s);
}

/** Insert thousand separators while keeping an optional decimal part. */
export function formatAmountGrouping(raw: string): string {
    if (raw === "") return "";
    const negative = raw.trimStart().startsWith("-");
    const body = raw.replace(/-/g, "").replace(/,/g, "");
    const hasDot = body.includes(".");
    const [intPart = "", ...decParts] = body.split(".");
    const intDigits = intPart.replace(/\D/g, "");
    const decDigits = hasDot ? decParts.join("").replace(/\D/g, "").slice(0, 2) : "";

    if (!intDigits && !hasDot) return negative ? "-" : "";

    const grouped = (intDigits || "0").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    const sign = negative ? "-" : "";
    if (hasDot) return `${sign}${grouped}.${decDigits}`;
    return `${sign}${grouped}`;
}
