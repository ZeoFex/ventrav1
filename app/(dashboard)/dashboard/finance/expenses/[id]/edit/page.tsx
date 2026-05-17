import { ExpenseEditView } from "@/app/components/dashboard/finance/expense-edit-view";

export default async function EditExpensePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <ExpenseEditView expenseId={id} />;
}
