/**
 * Paystack MoMo reference format: vpn_{businessId}_{timestamp}_{planCode}_{cycleCode}
 * planCode: sta, gro, pro — cycleCode: mon | ann
 */
export type ParsedBillingReference = {
    plan: "starter" | "growth" | "pro";
    cycle: "monthly" | "annually";
};

export function extractDetailsFromReference(
    ref: string,
): ParsedBillingReference | null {
    const parts = ref.split("_");
    if (parts.length < 4 || parts[0] !== "vpn") return null;

    const planCode = parts[3].toLowerCase();

    let plan: "starter" | "growth" | "pro" = "starter";
    if (planCode.includes("pro")) plan = "pro";
    if (planCode.includes("gro")) plan = "growth";
    if (planCode.includes("sta")) plan = "starter";

    let cycle: "monthly" | "annually" = "monthly";
    if (parts.length >= 5) {
        const cycleCode = parts[4].toLowerCase();
        if (cycleCode === "ann") cycle = "annually";
    }

    return { plan, cycle };
}
