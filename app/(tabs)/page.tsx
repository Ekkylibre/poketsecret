import { MagasinsList } from "@/components/magasins-list";
import { auth } from "@/lib/auth/server";
import {
  fetchAuthorPseudos,
  fetchAvailabilities,
  fetchFollowState,
  fetchProducts,
  fetchStores,
} from "@/lib/queries";
import { fetchSeriesExtensions } from "@/lib/tcgdex";

export const dynamic = "force-dynamic";

export default async function MagasinsPage({
  searchParams,
}: {
  searchParams: Promise<{ store?: string; dispo?: string }>;
}) {
  const { store, dispo } = await searchParams;
  const { data: session } = await auth.getSession();

  const [stores, availabilities, products, referenceExtensions, authorPseudos, followState] =
    await Promise.all([
      fetchStores(),
      fetchAvailabilities(),
      fetchProducts(),
      fetchSeriesExtensions(),
      fetchAuthorPseudos(),
      session?.user
        ? fetchFollowState(session.user.id)
        : Promise.resolve({ pinnedStoreIds: [], followedStoreIds: [], followedProductIds: [] }),
    ]);

  return (
    <MagasinsList
      stores={stores}
      availabilities={availabilities}
      products={products}
      referenceExtensions={referenceExtensions}
      pinnedStoreIds={followState.pinnedStoreIds}
      followedStoreIds={followState.followedStoreIds}
      followedProductIds={followState.followedProductIds}
      targetStoreId={store}
      targetDispoId={dispo}
      authorPseudos={authorPseudos}
    />
  );
}
