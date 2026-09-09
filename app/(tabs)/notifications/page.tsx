import { Bell } from "lucide-react";
import { redirect } from "next/navigation";

import { type NotificationGroup, NotificationsList } from "@/components/notifications-list";
import { SuivreProduitDialog } from "@/components/suivre-produit-dialog";
import { auth } from "@/lib/auth/server";
import { dateBucket, type DateBucket } from "@/lib/confidence";
import { getFollowedAvailabilities, notificationDate } from "@/lib/notifications";
import { fetchAuthorPseudos, fetchProducts } from "@/lib/queries";
import { fetchSeriesExtensions } from "@/lib/tcgdex";

const BUCKET_ORDER: DateBucket[] = ["Aujourd'hui", "Hier", "7 derniers jours", "Plus ancien"];

// Lit la base à chaque requête (dismiss/markRead écrivent dedans) : sans rendu
// dynamique, Next mettrait la page en cache statique et servirait un rendu figé.
export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const { data: session } = await auth.getSession();
  if (!session?.user) redirect("/auth/sign-in");

  const [followedAvailabilities, produits, referenceExtensions, authorPseudos] = await Promise.all([
    getFollowedAvailabilities(session.user.id),
    fetchProducts(),
    fetchSeriesExtensions(),
    fetchAuthorPseudos(),
  ]);

  const byBucket = new Map<DateBucket, typeof followedAvailabilities>();
  for (const item of followedAvailabilities) {
    const bucket = dateBucket(notificationDate(item.availability));
    if (!byBucket.has(bucket)) byBucket.set(bucket, []);
    byBucket.get(bucket)!.push(item);
  }

  const groups: NotificationGroup[] = BUCKET_ORDER.filter((bucket) => byBucket.has(bucket)).map(
    (bucket) => ({ bucket, items: byBucket.get(bucket)! })
  );

  return (
    <div className="flex flex-1 flex-col">
      <SuivreProduitDialog products={produits} referenceExtensions={referenceExtensions} />

      {followedAvailabilities.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
          <div className="bg-muted flex size-14 items-center justify-center rounded-full">
            <Bell className="text-muted-foreground size-5" />
          </div>
          <p className="text-muted-foreground text-sm">
            Suis un produit ou un magasin pour être alerté ici.
          </p>
        </div>
      ) : (
        <NotificationsList
          groups={groups}
          allIds={followedAvailabilities.map((a) => a.availability.id)}
          authorPseudos={authorPseudos}
        />
      )}
    </div>
  );
}
