import { BranchesEditView } from "@/app/components/dashboard/branches/branches-edit-view";

export const metadata = {
    title: "Manage Branch | VentraPOS",
};

export default async function BranchesEditPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    return <BranchesEditView branchId={id} />;
}
