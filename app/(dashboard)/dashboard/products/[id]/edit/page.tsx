import { ProductsEditView } from "@/app/components/dashboard/products/products-edit-view";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditProductPage({ params }: PageProps) {
  const { id } = await params;
  return <ProductsEditView productId={id} />;
}
