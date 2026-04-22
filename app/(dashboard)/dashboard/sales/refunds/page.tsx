import { Suspense } from "react";
import { SalesRefundsView } from "@/app/components/dashboard/sales/sales-refunds-view";

export const metadata = {
    title: "Returns / refunds | VentraPOS",
};

export default function SalesRefundsPage() {
    return (
        <Suspense
            fallback={
                <div className="mx-auto flex w-full max-w-3xl justify-center px-4 py-16 text-muted-foreground">Loading…</div>
            }
        >
            <SalesRefundsView />
        </Suspense>
    );
}
