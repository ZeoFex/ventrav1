import { ProductDetailView } from "@/app/components/dashboard/products/product-detail-view";

type PageProps = { params: Promise<{ id: string }> };

export default async function ProductDetailPage({ params }: PageProps) {
    const { id } = await params;
    return <ProductDetailView productId={id} />;
}
