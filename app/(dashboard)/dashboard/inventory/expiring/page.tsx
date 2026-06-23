import { Suspense } from "react";
import { ExpiringInventoryView } from "@/app/components/dashboard/inventory/expiring-inventory-view";
import { Loader2 } from "lucide-react";

export default function ExpiringInventoryPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <ExpiringInventoryView />
    </Suspense>
  );
}
