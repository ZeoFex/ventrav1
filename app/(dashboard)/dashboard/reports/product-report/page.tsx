import { ProductReportView } from "@/app/components/dashboard/reports/product-report-view";

export const metadata = {
    title: "Product Report | VentraPOS",
    description: "Per-product sales analytics including revenue and profit by day, week, and month.",
};

export default function ProductReportPage() {
    return <ProductReportView />;
}
