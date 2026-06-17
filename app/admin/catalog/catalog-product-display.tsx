import { Barcode, ImageOff, Store } from "lucide-react";
import { CatalogProductImage } from "@/app/components/dashboard/products/catalog-product-image";
import { cn } from "@/lib/utils";
import type { MasterProduct } from "./catalog-admin-types";

export function CatalogProductThumb({
    product,
    size = "md",
}: {
    product: Pick<MasterProduct, "name" | "imageSrc">;
    size?: "sm" | "md" | "lg";
}) {
    const dim =
        size === "lg" ? "h-14 w-14" : size === "sm" ? "h-9 w-9" : "h-11 w-11";

    if (product.imageSrc) {
        return (
            <div
                className={cn(
                    dim,
                    "shrink-0 overflow-hidden rounded-lg border border-border bg-muted"
                )}
            >
                <CatalogProductImage
                    src={product.imageSrc}
                    alt={product.name}
                    className="h-full w-full object-cover"
                />
            </div>
        );
    }

    return (
        <div
            className={cn(
                dim,
                "flex shrink-0 items-center justify-center rounded-lg border border-dashed border-border bg-muted/60 text-muted-foreground"
            )}
        >
            <ImageOff className={size === "sm" ? "h-4 w-4" : "h-5 w-5"} aria-hidden />
        </div>
    );
}

export function CatalogProductMeta({
    product,
    compact = false,
}: {
    product: MasterProduct;
    compact?: boolean;
}) {
    return (
        <div className={cn("min-w-0", compact ? "space-y-0.5" : "space-y-1")}>
            <p className="truncate font-medium text-foreground">{product.name}</p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                {product.sourceBusinessName ? (
                    <span className="inline-flex max-w-[14rem] items-center gap-1 truncate">
                        <Store className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        <span className="truncate">{product.sourceBusinessName}</span>
                    </span>
                ) : null}
                {product.barcode ? (
                    <span className="inline-flex items-center gap-1 font-mono">
                        <Barcode className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        {product.barcode}
                    </span>
                ) : null}
                {product.sku ? (
                    <span className="font-mono">SKU {product.sku}</span>
                ) : null}
            </div>
        </div>
    );
}
