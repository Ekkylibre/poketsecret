import { CarteExplorer } from "@/components/carte-explorer";
import { auth } from "@/lib/auth/server";
import { fetchAuthorPseudos, fetchStores } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function CartePage() {
  const [stores, authorPseudos, { data: session }] = await Promise.all([
    fetchStores(),
    fetchAuthorPseudos(),
    auth.getSession(),
  ]);
  const currentUser = session?.user ? authorPseudos[session.user.id] : undefined;

  return <CarteExplorer stores={stores} authorPseudos={authorPseudos} currentUser={currentUser} />;
}
