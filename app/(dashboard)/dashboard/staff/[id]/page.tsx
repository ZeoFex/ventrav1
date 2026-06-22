import { StaffDetailView } from "@/app/components/dashboard/staff/staff-detail-view";

type PageProps = {
    params: Promise<{ id: string }>;
};

export default async function StaffDetailPage({ params }: PageProps) {
    const { id } = await params;
    return <StaffDetailView staffId={id} />;
}
