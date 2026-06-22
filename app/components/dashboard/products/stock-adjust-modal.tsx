"use client";

import { Loader2, Minus, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatGhs } from "@/app/lib/catalog-utils";
import { formatQuantity, unitShort } from "@/app/lib/product-units";

export type StockAdjustProduct = {
  id: string;
  name: string;
  stock: number;
  priceGhs: number | string;
  costPriceGhs?: number | string | null;
  unit?: string | null;
};

type StockAdjustModalProps = {
  product: StockAdjustProduct | null;
  onClose: () => void;
  onSaved: () => void;
};

export function StockAdjustModal({ product, onClose, onSaved }: StockAdjustModalProps) {
  const [delta, setDelta] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (product) {
      setDelta(0);
      setError(null);
    }
  }, [product]);

  const price = product ? Number(product.priceGhs) || 0 : 0;
  const cost = product
    ? product.costPriceGhs != null && String(product.costPriceGhs).length > 0
      ? Number(product.costPriceGhs)
      : null
    : null;

  const lineTotal = cost != null && Number.isFinite(cost) ? cost * Math.abs(delta) : null;
  const marginPct =
    cost != null && Number.isFinite(cost) && price > 0
      ? ((price - cost) / price) * 100
      : null;

  const newStock = product ? Math.max(0, product.stock + delta) : 0;

  const canSave = product && delta !== 0 && newStock >= 0;

  const handleSave = async () => {
    if (!product || !canSave || saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/products/${product.id}/stock`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delta }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((data as { error?: string }).error || "Stock update failed");
      }
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Stock update failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!product} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adjust stock</DialogTitle>
          <DialogDescription>
            {product ? (
              <>
                <span className="font-medium text-foreground">{product.name}</span>
                {" · "}Current: {formatQuantity(product.stock, product.unit)}
              </>
            ) : (
              "Update on-hand quantity"
            )}
          </DialogDescription>
        </DialogHeader>

        {product ? (
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => setDelta((d) => d - 1)}
                disabled={newStock <= 0 && delta <= 0}
                className="flex size-11 items-center justify-center rounded-xl border border-border hover:bg-muted disabled:opacity-40"
                aria-label="Decrease adjustment"
              >
                <Minus className="size-4" />
              </button>
              <div className="min-w-[5rem] text-center">
                <p className="text-2xl font-bold tabular-nums text-foreground">
                  {delta > 0 ? `+${delta}` : delta}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {unitShort(product.unit) || "units"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDelta((d) => d + 1)}
                className="flex size-11 items-center justify-center rounded-xl border border-border hover:bg-muted"
                aria-label="Increase adjustment"
              >
                <Plus className="size-4" />
              </button>
            </div>

            <div className="rounded-xl bg-muted/40 px-4 py-3 text-[13px]">
              <p className="text-muted-foreground">
                New stock:{" "}
                <span className="font-semibold tabular-nums text-foreground">
                  {formatQuantity(newStock, product.unit)}
                </span>
              </p>
              {lineTotal != null ? (
                <p className="mt-1 text-muted-foreground">
                  Cost impact:{" "}
                  <span className="font-semibold tabular-nums text-foreground">
                    {formatGhs(cost!)} × {Math.abs(delta)} = {formatGhs(lineTotal)}
                  </span>
                </p>
              ) : null}
              {marginPct != null ? (
                <p className="mt-1 text-muted-foreground">
                  Margin:{" "}
                  <span className="font-semibold tabular-nums text-foreground">
                    {marginPct.toFixed(1)}%
                  </span>
                  <span className="ml-1 text-[11px]">
                    ({formatGhs(cost!)} cost vs {formatGhs(price)} price)
                  </span>
                </p>
              ) : null}
            </div>

            {error ? <p className="text-[13px] text-destructive">{error}</p> : null}
          </div>
        ) : null}

        <DialogFooter className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border px-4 py-2 font-semibold"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave || saving}
            className="flex items-center gap-2 rounded-xl bg-[#003527] px-5 py-2 font-bold text-white disabled:opacity-50"
          >
            {saving && <Loader2 className="size-4 animate-spin" />}
            Apply
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
