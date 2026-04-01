import { ExpensesView } from "@/app/components/dashboard/finance/expenses-view";

export const metadata = {
    title: "Expenses | VentraPOS",
    description: "Track and manage your operational expenses.",
};

export default function ExpensesPage() {
    return <ExpensesView />;
}
