import { SupplierDetailView } from "@/app/components/dashboard/suppliers/supplier-detail-view";

export default async function SupplierDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <SupplierDetailView supplierId={id} />;
}
