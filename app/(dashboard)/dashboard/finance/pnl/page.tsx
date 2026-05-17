import { ProfitDetailView } from "@/app/components/dashboard/sales/profit-detail-view";
import { Suspense } from "react";

export default function FinancePnlPage() {
    return (
        <Suspense fallback={null}>
            <ProfitDetailView variant="finance" />
        </Suspense>
    );
}
