import { Suspense } from "react";
import { PosSaleView } from "@/app/components/dashboard/pos/sale/pos-sale-view";

export default function PosSalePage() {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <Suspense fallback={null}>
        <PosSaleView />
      </Suspense>
    </div>
  );
}
