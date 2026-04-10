import { ProductEditorClient } from "../product-editor-client";

export default async function AdminEditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProductEditorClient mode="edit" productId={id} />;
}
