import { ExpenseNewView } from "@/app/components/dashboard/finance/expense-new-view";

export const metadata = {
    title: "Record Expense | VentraPOS",
    description: "Log a new operational expense or supply purchase.",
};

export default function NewExpensePage() {
    return <ExpenseNewView />;
}
