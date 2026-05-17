import { redirect } from "next/navigation";

export default async function LegacyContactsSupplierEdit({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    redirect(`/dashboard/suppliers/${id}/edit`);
}
