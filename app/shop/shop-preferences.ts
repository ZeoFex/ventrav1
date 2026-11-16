export type ShopVariation = {
  id: string;
  name: string;
  type: string;
  priceGhs: string | null;
  sellable: number;
};

export type PreferenceOption = {
  label: string;
  variationId?: string;
  priceGhs?: string | null;
  sellable?: number;
};

export type PreferenceGroup = {
  label: string;
  options: PreferenceOption[];
};

const CLOTHING =
  /\b(shirt|dress|trouser|trousers|jean|jeans|skirt|blouse|gown|shorts|sock|socks|hoodie|sweater|uniform|singlet|polo|cloth|clothes|clothing|wear|apparel|fashion|jacket|coat|leggings|romper|onesie)\b/i;
const SHOE = /\b(shoe|shoes|sandal|sandals|slipper|slippers|footwear|sneaker|sneakers)\b/i;
const NOT_CLOTHING = /\b(doll|toy|helmet|towel|blanket|case)\b/i;
const NOT_FOOD =
  /\b(wash|soap|bottle|feeder|lotion|shampoo|wipes|wipe|detergent|doll|toy|helmet|towel|blanket|case|accessory|accessories)\b/i;
const DRINK =
  /\b(beverage|beverages|drink|drinks|juice|malt|cola|soda|wine|water|cocktail|energy|smoothie|yoghurt|yogurt|milk|tea|coffee)\b/i;
const MEAL =
  /\b(jollof|fufu|waakye|banku|kenkey|stew|soup|pizza|burger|kebab|fried rice|fried chicken|meal|rice and)\b/i;
const FOOD =
  /\b(food|snack|snacks|cereal|porridge|custard|formula|biscuit|biscuits|puree|oats|tom\s*brown|koko|flour|breakfast)\b/i;

const ADULT_SIZES = ["XS", "S", "M", "L", "XL", "XXL"];
const BABY_SIZES = ["0–3 months", "3–6 months", "6–12 months", "1–2 years", "2–3 years"];
const SHOE_SIZES = ["36", "37", "38", "39", "40", "41", "42", "43", "44", "45"];
const BABY_SHOE_SIZES = ["16", "17", "18", "19", "20", "21", "22"];
const COLORS = ["Black", "White", "Blue", "Pink", "Red", "Yellow", "Green", "Cream", "Grey", "Brown"];

function haystack(name: string, categoryName: string) {
  return `${categoryName} ${name}`.trim();
}

function isBaby(name: string, categoryName: string) {
  return /\b(baby|infant|newborn|months)\b/i.test(haystack(name, categoryName));
}

function savedGroups(
  name: string,
  categoryName: string,
  variations: ShopVariation[],
): PreferenceGroup[] {
  const buckets = new Map<string, PreferenceOption[]>();
  for (const variation of variations) {
    if (!variation.name) continue;
    const raw = variation.type || "Option";
    const sameAsProduct = raw.toLowerCase() === name.trim().toLowerCase();
    const label = sameAsProduct
      ? foodKind(name, categoryName)
        ? "Flavour"
        : "Option"
      : raw.charAt(0).toUpperCase() + raw.slice(1);
    const options = buckets.get(label) ?? [];
    options.push({
      label: variation.name,
      variationId: variation.id,
      priceGhs: variation.priceGhs,
      sellable: variation.sellable,
    });
    buckets.set(label, options);
  }
  return [...buckets.entries()].map(([label, options]) => ({ label, options }));
}

function foodKind(name: string, categoryName: string): "drink" | "meal" | "packaged" | null {
  const text = haystack(name, categoryName);
  if (NOT_FOOD.test(name) || NOT_FOOD.test(categoryName)) return null;
  if (MEAL.test(text)) return "meal";
  if (/\bbeverages?\b/i.test(categoryName) || (DRINK.test(name) && !/\bfood\b/i.test(categoryName))) {
    return "drink";
  }
  if (FOOD.test(text) || /\b(food|snack)/i.test(categoryName)) return "packaged";
  if (DRINK.test(text)) return "drink";
  return null;
}

function clothingGroups(name: string, categoryName: string): PreferenceGroup[] | null {
  const text = haystack(name, categoryName);
  if (NOT_CLOTHING.test(name)) return null;
  const clothing = CLOTHING.test(text) || /\b(wear|cloth|apparel|fashion)\b/i.test(categoryName);
  const shoes = SHOE.test(text);
  if (!clothing && !shoes) return null;
  const baby = isBaby(name, categoryName);
  const sizes = shoes ? (baby ? BABY_SHOE_SIZES : SHOE_SIZES) : baby ? BABY_SIZES : ADULT_SIZES;
  return [
    { label: "Size", options: sizes.map((label) => ({ label })) },
    { label: "Color", options: COLORS.map((label) => ({ label })) },
  ];
}

export function preferenceGroups(product: {
  name: string;
  categoryName: string;
  variations?: ShopVariation[];
}): PreferenceGroup[] {
  const saved = savedGroups(product.name, product.categoryName, product.variations ?? []);
  if (saved.length > 0) return saved;

  const clothing = clothingGroups(product.name, product.categoryName);
  if (clothing) return clothing;

  const food = foodKind(product.name, product.categoryName);
  if (food === "meal") {
    return [
      { label: "Portion", options: ["Small", "Regular", "Large"].map((label) => ({ label })) },
      { label: "Spice", options: ["Not spicy", "Mild", "Hot"].map((label) => ({ label })) },
    ];
  }
  if (food === "drink") {
    return [
      { label: "Size", options: ["Small", "Medium", "Large"].map((label) => ({ label })) },
      { label: "Serve", options: ["Chilled", "Room temperature"].map((label) => ({ label })) },
    ];
  }
  if (food === "packaged") {
    return [{ label: "Pack", options: ["Single", "Twin", "Family"].map((label) => ({ label })) }];
  }
  return [];
}

export function preferenceSummary(choices: { group: string; label: string }[]) {
  return choices.map((choice) => `${choice.group}: ${choice.label}`).join(", ");
}
