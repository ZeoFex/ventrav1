/**
 * Default category names per shop type.
 * Seeded into each business on onboarding completion.
 */
export type ShopTypeSlug =
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

export const SHOP_TYPE_LABELS: Record<ShopTypeSlug, string> = {
    pharmacy: "Pharmacy",
    agrochemical_shop: "Agrochemical Shop",
    building_construction: "Building & Construction Materials",
    boutique_fashion: "Boutique / Fashion Store",
    supermarket: "Supermarket",
    cold_store: "Cold Store",
    electronics_store: "Electronics Store",
    hardware_store: "Hardware Store",
    stationery_bookshop: "Stationery & Bookshop",
    furniture_store: "Furniture Store",
    cosmetics_beauty: "Cosmetics & Beauty Shop",
    general_retail_store: "General Retail Store",
};

/** Maps legacy onboarding / business_type values to current shop type slugs. */
export const LEGACY_BUSINESS_TYPE_MAP: Record<string, ShopTypeSlug> = {
    pharmacy: "pharmacy",
    agro_chemicals: "agrochemical_shop",
    agrochemical_shop: "agrochemical_shop",
    building_construction: "building_construction",
    boutique: "boutique_fashion",
    boutique_fashion: "boutique_fashion",
    supermarket: "supermarket",
    mini_mart: "supermarket",
    cold_store: "cold_store",
    electronics: "electronics_store",
    electronics_store: "electronics_store",
    hardware_store: "hardware_store",
    stationery_bookshop: "stationery_bookshop",
    furniture_store: "furniture_store",
    cosmetics_beauty: "cosmetics_beauty",
    retail: "general_retail_store",
    other: "general_retail_store",
    general_retail_store: "general_retail_store",
};

export function resolveShopTypeSlug(
    businessType: string | null | undefined,
): ShopTypeSlug {
    if (!businessType) return "general_retail_store";
    return LEGACY_BUSINESS_TYPE_MAP[businessType] ?? "general_retail_store";
}

export const SHOP_TYPE_DEFAULT_CATEGORIES: Record<ShopTypeSlug, string[]> = {
    pharmacy: [
        "Prescription Medicines",
        "OTC Medicines",
        "Antibiotics",
        "Pain Relief",
        "Cold & Flu",
        "Vitamins & Supplements",
        "Diabetes Care",
        "Cardiovascular Medicines",
        "Dermatology Products",
        "Women's Health",
        "Children's Medicines",
        "Medical Devices",
        "First Aid & Wound Care",
        "Personal Care",
        "Laboratory Supplies",
    ],
    agrochemical_shop: [
        "Herbicides",
        "Insecticides",
        "Fungicides",
        "Rodenticides",
        "Fertilizers",
        "Micronutrients",
        "Organic Fertilizers",
        "Biofertilizers",
        "Plant Growth Regulators",
        "Seeds",
        "Seed Treatments",
        "Sprayers",
        "Irrigation Supplies",
        "Farm Tools",
        "Protective Equipment",
        "Veterinary Products",
    ],
    building_construction: [
        "Cement",
        "Sand & Aggregates",
        "Bricks & Blocks",
        "Steel & Reinforcement",
        "Roofing Materials",
        "Plumbing Supplies",
        "Electrical Supplies",
        "Paints & Finishes",
        "Tiles & Flooring",
        "Doors & Windows",
        "Hardware & Fasteners",
        "Tools & Equipment",
        "Safety Equipment",
        "Glass & Aluminum",
        "Insulation Materials",
    ],
    boutique_fashion: [
        "Men's Clothing",
        "Women's Clothing",
        "Children's Clothing",
        "Shoes",
        "Bags & Handbags",
        "Jewelry",
        "Watches",
        "Belts",
        "Hats & Caps",
        "Fashion Accessories",
        "Lingerie",
        "Sportswear",
        "Traditional Wear",
        "Beauty Products",
        "Perfumes",
    ],
    supermarket: [
        "Groceries",
        "Beverages",
        "Dairy Products",
        "Bakery",
        "Frozen Foods",
        "Fruits",
        "Vegetables",
        "Meat & Poultry",
        "Seafood",
        "Snacks",
        "Confectionery",
        "Household Supplies",
        "Cleaning Products",
        "Personal Care",
        "Baby Products",
        "Pet Supplies",
    ],
    cold_store: [
        "Frozen Meat",
        "Frozen Chicken",
        "Frozen Fish",
        "Seafood",
        "Frozen Vegetables",
        "Frozen Fruits",
        "Ice Cream",
        "Dairy Products",
        "Chilled Beverages",
        "Processed Foods",
        "Sausages & Bacon",
        "Cold Cuts",
        "Frozen Snacks",
    ],
    electronics_store: [
        "Smartphones",
        "Tablets",
        "Laptops",
        "Desktop Computers",
        "Printers",
        "Networking Equipment",
        "Televisions",
        "Audio Systems",
        "Cameras",
        "Gaming Consoles",
        "Computer Accessories",
        "Mobile Accessories",
        "Home Appliances",
        "Power Solutions",
        "Security Systems",
    ],
    hardware_store: [
        "Hand Tools",
        "Power Tools",
        "Fasteners",
        "Plumbing Supplies",
        "Electrical Supplies",
        "Paints",
        "Adhesives",
        "Safety Equipment",
        "Garden Tools",
        "Welding Supplies",
        "Locks & Security",
        "Building Materials",
    ],
    stationery_bookshop: [
        "Books",
        "Exercise Books",
        "Office Supplies",
        "Writing Materials",
        "School Supplies",
        "Printing Paper",
        "Art Materials",
        "Filing & Storage",
        "Calculators",
        "Educational Materials",
    ],
    furniture_store: [
        "Living Room Furniture",
        "Bedroom Furniture",
        "Dining Furniture",
        "Office Furniture",
        "Outdoor Furniture",
        "Mattresses",
        "Home Decor",
        "Storage Solutions",
    ],
    cosmetics_beauty: [
        "Makeup",
        "Skincare",
        "Haircare",
        "Fragrances",
        "Beauty Tools",
        "Nail Care",
        "Men's Grooming",
        "Personal Hygiene",
    ],
    general_retail_store: [
        "Food & Beverages",
        "Household Items",
        "Personal Care",
        "Electronics",
        "Clothing",
        "Stationery",
        "Toys",
        "Hardware",
        "Health Products",
        "Miscellaneous",
    ],
};

/** Optional default subcategories keyed by category name (shop-type-specific). */
export const SHOP_TYPE_DEFAULT_SUBCATEGORIES: Partial<
    Record<ShopTypeSlug, Record<string, string[]>>
> = {
    electronics_store: {
        Laptops: ["Gaming Laptops", "Business Laptops", "Chromebooks"],
        Smartphones: ["Android", "iPhone", "Feature Phones"],
        Printers: ["Inkjet", "Laser", "Multifunction"],
    },
    pharmacy: {
        Antibiotics: ["Penicillins", "Cephalosporins", "Macrolides"],
        "Pain Relief": ["Paracetamol", "Ibuprofen", "Aspirin"],
        "Vitamins & Supplements": ["Multivitamins", "Vitamin C", "Vitamin D"],
    },
};

export function slugifyCategoryName(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}
