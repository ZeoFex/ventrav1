"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import { ProductForm, type ProductFormInitialValues } from "./product-form";
import { useProduct } from "./products-data-hooks";

export function ProductsEditView({ productId }: { productId: string }) {
  const { product, isLoading, isError } = useProduct(productId);

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !product) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-foreground">
          Product not found
        </h1>
        <p className="mt-2 text-[15px] text-muted-foreground">
          This product may have been removed or the link is incorrect.
        </p>
        <Link
          href="/dashboard/products"
          className="mt-6 inline-flex rounded-xl bg-gradient-to-br from-[#003527] to-[#064e3b] px-5 py-2.5 text-[14px] font-semibold text-white shadow-[0_8px_24px_-8px_rgba(0,53,39,0.45)]"
        >
          Back to products
        </Link>
      </main>
    );
  }

  const initial: ProductFormInitialValues = {
    name: product.name,
    sku: product.sku,
    description: product.description ?? "",
    price: Number(product.priceGhs),
    costPrice:
      product.costPriceGhs != null && String(product.costPriceGhs).length > 0
        ? Number(product.costPriceGhs)
        : "",
    stock: product.stock,
    reorderAt: product.reorderAt,
    categoryId: product.categoryId || "all",
    tagIds: product.tagIds || [],
    status: product.status,
    imageSrc: product.imageSrc || null,
    unit: product.unit ?? undefined,
    variations: product.variations || [],
  };

  return (
    <ProductForm
      key={productId}
      mode="edit"
      productId={product.id}
      initial={initial}
      title="Edit product"
      shellDescription="Update details and inventory."
    />
  );
}
