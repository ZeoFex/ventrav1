import { Suspense } from "react";
import { PosSaleView } from "@/app/components/dashboard/pos/sale/pos-sale-view";

export default function PosSalePage() {
  return (
    <Suspense fallback={null}>
      <PosSaleView />
    </Suspense>
  );
}
