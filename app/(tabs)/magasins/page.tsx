import { MagasinsList } from "@/components/magasins-list";
import { mockAvailabilities, mockCurrentUser, mockProducts, mockStores } from "@/lib/mock-data";

export default function MagasinsPage() {
  return (
    <MagasinsList
      stores={mockStores}
      availabilities={mockAvailabilities}
      products={mockProducts}
      favoriteStoreIds={mockCurrentUser.favoriteStoreIds}
    />
  );
}
