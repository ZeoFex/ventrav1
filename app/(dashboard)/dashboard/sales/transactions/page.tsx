import { TransactionsDetailView } from "@/app/components/dashboard/sales/transactions-detail-view";
import { Suspense } from "react";

export default function Page() {
    return (
        <Suspense fallback={null}>
            <TransactionsDetailView />
        </Suspense>
    );
}
