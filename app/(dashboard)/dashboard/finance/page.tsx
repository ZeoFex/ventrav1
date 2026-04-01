import { FinanceOverviewView } from "@/app/components/dashboard/finance/finance-overview-view";

export const metadata = {
    title: "Finance Overview | VentraPOS",
    description: "Track your sales revenue, cash flow, and net profit.",
};

export default function FinanceOverviewPage() {
    return <FinanceOverviewView />;
}
