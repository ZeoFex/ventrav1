import { SupplierFormView } from "@/app/components/dashboard/suppliers/supplier-form-view";

export default async function EditSupplierPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <SupplierFormView mode="edit" supplierId={id} />;
}
