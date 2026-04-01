import { AverageOrderValueDetailView } from "@/app/components/dashboard/sales/average-order-value-detail-view";
import { Suspense } from "react";

export default function Page() {
    return (
        <Suspense fallback={null}>
            <AverageOrderValueDetailView />
        </Suspense>
    );
}
