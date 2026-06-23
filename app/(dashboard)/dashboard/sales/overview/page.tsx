import { cookies } from "next/headers";
import { verifyAccessToken } from "@/server/auth/token-service";
import { COOKIE_NAMES } from "@/server/config/auth-config";
import { getSalesOverview } from "@/server/pos/pos-service";
import { SalesOverviewContent } from "@/app/components/dashboard/sales/sales-overview-content";

export const metadata = {
    title: "Sales Overview | VentraPOS",
};

export default async function SalesOverviewPage() {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAMES.ACCESS)?.value;

    let fallbackData = null;
    if (token) {
        try {
            const payload = await verifyAccessToken(token);
            fallbackData = await getSalesOverview(payload.bid);
        } catch (e) {
            console.error("Failed to prefetch sales overview:", e);
        }
    }

    return (
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <div className="flex flex-col gap-1">
                <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-foreground">
                    Sales Overview
                </h1>
                <p className="text-[14px] text-muted-foreground">
                    Monitor your store&apos;s revenue, transactions, and performance.
                </p>
            </div>

            <SalesOverviewContent fallback={fallbackData} />
        </div>
    );
}
