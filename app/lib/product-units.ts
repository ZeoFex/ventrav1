/**
 * Canonical list of product units of measure.
 *
 * Ventra POS lets every business — retail, cold-store, restaurant, pharmacy,
 * boutique, etc. — stock items by piece, weight, volume or pack. This module
 * is the single source of truth so the product form, lists, inventory view
 * and POS all speak the same language.
 */

export type ProductUnit = {
    /** Stored in the database (lowercase, short). */
    value: string;
    /** What we show next to a quantity, e.g. "1.5 kg". */
    short: string;
    /** Human label used in dropdowns. */
    label: string;
    /**
     * Whether fractional quantities normally make sense for this unit.
     * Weight/volume units are decimal-friendly; countable units are not.
     */
    decimal?: boolean;
    group: "count" | "weight" | "volume" | "length" | "pack";
};

export const PRODUCT_UNITS: ProductUnit[] = [
    // Count
    { value: "piece", short: "pcs", label: "Piece", group: "count" },
    { value: "dozen", short: "dz", label: "Dozen", group: "count" },

    // Weight
    { value: "kg", short: "kg", label: "Kilogram (kg)", decimal: true, group: "weight" },
    { value: "g", short: "g", label: "Gram (g)", group: "weight" },
    { value: "lb", short: "lb", label: "Pound (lb)", decimal: true, group: "weight" },
    { value: "oz", short: "oz", label: "Ounce (oz)", decimal: true, group: "weight" },

    // Volume
    { value: "l", short: "L", label: "Litre (L)", decimal: true, group: "volume" },
    { value: "ml", short: "mL", label: "Millilitre (mL)", group: "volume" },
    { value: "gal", short: "gal", label: "Gallon (gal)", decimal: true, group: "volume" },

    // Length
    { value: "m", short: "m", label: "Metre (m)", decimal: true, group: "length" },
    { value: "cm", short: "cm", label: "Centimetre (cm)", group: "length" },
    { value: "ft", short: "ft", label: "Foot (ft)", decimal: true, group: "length" },

    // Packaging
    { value: "pack", short: "pack", label: "Pack", group: "pack" },
    { value: "box", short: "box", label: "Box", group: "pack" },
    { value: "carton", short: "carton", label: "Carton", group: "pack" },
    { value: "bundle", short: "bundle", label: "Bundle", group: "pack" },
    { value: "bag", short: "bag", label: "Bag", group: "pack" },
    { value: "crate", short: "crate", label: "Crate", group: "pack" },
];

export const DEFAULT_PRODUCT_UNIT = "piece";

const UNIT_INDEX = new Map(PRODUCT_UNITS.map((u) => [u.value.toLowerCase(), u]));

/** Look up a unit by its stored value (case-insensitive). */
export function getUnit(value?: string | null): ProductUnit | undefined {
    if (!value) return undefined;
    return UNIT_INDEX.get(value.toLowerCase());
}

/** Short label shown after a quantity. Falls back to the raw value for custom units. */
export function unitShort(value?: string | null): string {
    if (!value || value === DEFAULT_PRODUCT_UNIT) return "";
    return getUnit(value)?.short ?? value;
}

/**
 * Format a quantity with its unit, e.g. `5 kg`, `1500 mL`, `12 pcs`.
 * Returns just the quantity for pieces so existing lists stay clean.
 */
export function formatQuantity(
    qty: number | string,
    unit?: string | null,
    options: { showPieces?: boolean } = {},
): string {
    const n = typeof qty === "string" ? Number(qty) : qty;
    const short = unitShort(unit);
    if (!short) {
        return options.showPieces && unit
            ? `${n} ${getUnit(unit)?.short ?? "pcs"}`
            : `${n}`;
    }
    return `${n} ${short}`;
}

/** Convenience: whether this unit expects decimal input in forms. */
export function isDecimalUnit(value?: string | null): boolean {
    return Boolean(getUnit(value)?.decimal);
}
