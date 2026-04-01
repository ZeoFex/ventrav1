import { RevenueDetailView } from "@/app/components/dashboard/sales/revenue-detail-view";
import { Suspense } from "react";

export default function Page() {
    return (
        <Suspense fallback={null}>
            <RevenueDetailView />
        </Suspense>
    );
}
