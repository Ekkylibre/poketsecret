import { CarteExplorer } from "@/components/carte-explorer";
import { fetchAuthorPseudos, fetchStores } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function CartePage() {
  const [stores, authorPseudos] = await Promise.all([fetchStores(), fetchAuthorPseudos()]);
  return <CarteExplorer stores={stores} authorPseudos={authorPseudos} />;
}
