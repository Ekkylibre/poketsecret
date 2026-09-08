import { MagasinsList } from "@/components/magasins-list";
import { mockAvailabilities, mockCurrentUser, mockProducts, mockStores } from "@/lib/mock-data";

export default async function MagasinsPage({
  searchParams,
}: {
  searchParams: Promise<{ store?: string; dispo?: string }>;
}) {
  const { store, dispo } = await searchParams;

  return (
    <MagasinsList
      stores={mockStores}
      availabilities={mockAvailabilities}
      products={mockProducts}
      pinnedStoreIds={mockCurrentUser.pinnedStoreIds}
      followedStoreIds={mockCurrentUser.followedStoreIds}
      followedProductIds={mockCurrentUser.followedProductIds}
      targetStoreId={store}
      targetDispoId={dispo}
    />
  );
}
