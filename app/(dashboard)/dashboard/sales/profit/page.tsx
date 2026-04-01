import { ProfitDetailView } from "@/app/components/dashboard/sales/profit-detail-view";
import { Suspense } from "react";

export default function Page() {
    return (
        <Suspense fallback={null}>
            <ProfitDetailView />
        </Suspense>
    );
}
