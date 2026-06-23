/** Shop type slugs — single source for onboarding and settings. */
export type BusinessTypeId =
  | "pharmacy"
  | "agrochemical_shop"
  | "building_construction"
  | "boutique_fashion"
  | "supermarket"
  | "cold_store"
  | "electronics_store"
  | "hardware_store"
  | "stationery_bookshop"
  | "furniture_store"
  | "cosmetics_beauty"
  | "general_retail_store";

export const BUSINESS_TYPES: {
  id: BusinessTypeId;
  label: string;
  hint: string;
}[] = [
  { id: "pharmacy", label: "Pharmacy", hint: "Medicines & health products" },
  {
    id: "agrochemical_shop",
    label: "Agrochemical Shop",
    hint: "Fertilizers, pesticides & farm inputs",
  },
  {
    id: "building_construction",
    label: "Building & Construction Materials",
    hint: "Cement, steel, tiles & supplies",
  },
  {
    id: "boutique_fashion",
    label: "Boutique / Fashion Store",
    hint: "Clothing, shoes & accessories",
  },
  { id: "supermarket", label: "Supermarket", hint: "Groceries at scale" },
  { id: "cold_store", label: "Cold Store", hint: "Meat, fish & frozen goods" },
  {
    id: "electronics_store",
    label: "Electronics Store",
    hint: "Phones, laptops & gadgets",
  },
  { id: "hardware_store", label: "Hardware Store", hint: "Tools & building supplies" },
  {
    id: "stationery_bookshop",
    label: "Stationery & Bookshop",
    hint: "Books, office & school supplies",
  },
  { id: "furniture_store", label: "Furniture Store", hint: "Home & office furniture" },
  {
    id: "cosmetics_beauty",
    label: "Cosmetics & Beauty Shop",
    hint: "Makeup, skincare & grooming",
  },
  {
    id: "general_retail_store",
    label: "General Retail Store",
    hint: "Mixed goods & neighbourhood shop",
  },
];

export function businessTypeLabel(slug: string | null | undefined): string {
  if (!slug) return "General Retail Store";
  const hit = BUSINESS_TYPES.find((t) => t.id === slug);
  return hit?.label ?? slug;
}

/** Map legacy display strings to slugs for businesses created before alignment. */
const LEGACY_TYPE_MAP: Record<string, BusinessTypeId> = {
  "Retail & Grocery": "general_retail_store",
  Pharmacy: "pharmacy",
  "Agro chemicals": "agrochemical_shop",
  Boutique: "boutique_fashion",
};

export function normalizeBusinessTypeSlug(value: string | null | undefined): BusinessTypeId | "" {
  if (!value) return "";
  if (BUSINESS_TYPES.some((t) => t.id === value)) return value as BusinessTypeId;
  return LEGACY_TYPE_MAP[value] ?? "";
}
