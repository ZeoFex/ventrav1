import { SalesSummaryView } from "@/app/components/dashboard/reports/sales-summary-view";

export const metadata = {
    title: "Sales Summary | VentraPOS",
    description: "Detailed analysis of sales metrics, COGS, and category performance.",
};

export default function SalesSummaryPage() {
    return <SalesSummaryView />;
}
