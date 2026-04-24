"use client";

import { generateClientProductId, generateProductSku } from "./product-catalog-codes";
import { ProductForm, type ProductFormInitialValues } from "./product-form";
import { DEFAULT_PRODUCT_UNIT } from "@/app/lib/product-units";

function buildInitial(): ProductFormInitialValues {
  return {
    name: "",
    sku: generateProductSku(),
    description: "",
    price: "",
    stock: 0,
    reorderAt: 5,
    categoryId: "all",
    tagIds: [],
    status: "active",
    imageSrc: null,
    unit: DEFAULT_PRODUCT_UNIT,
    variations: [],
  };
}

export function ProductsNewView() {
  const productId = generateClientProductId();
  const initial = buildInitial();

  return (
    <ProductForm
      mode="new"
      productId={productId}
      initial={initial}
      title="Add product"
      shellDescription="Create a new catalog item."
    />
  );
}
