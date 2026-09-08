import { Bell } from "lucide-react";

import { type NotificationGroup, NotificationsList } from "@/components/notifications-list";
import { SuivreProduitDialog } from "@/components/suivre-produit-dialog";
import { dateBucket, type DateBucket } from "@/lib/confidence";
import { mockCurrentUser, mockProducts, mockStores } from "@/lib/mock-data";
import { getFollowedAvailabilities, notificationDate } from "@/lib/notifications";
import type { Availability } from "@/lib/types";

const BUCKET_ORDER: DateBucket[] = ["Aujourd'hui", "Hier", "7 derniers jours", "Plus ancien"];

// Lit mockCurrentUser (mutable, modifié par les server actions dismiss/markRead) à chaque
// requête : sans ça, Next met la page en cache statique et sert un rendu figé au lieu de
// refléter les changements (cf. le même besoin sur profil/page.tsx).
export const dynamic = "force-dynamic";

export default function NotificationsPage() {
  const followedAvailabilities = getFollowedAvailabilities();

  const byBucket = new Map<DateBucket, Availability[]>();
  for (const availability of followedAvailabilities) {
    const bucket = dateBucket(notificationDate(availability));
    if (!byBucket.has(bucket)) byBucket.set(bucket, []);
    byBucket.get(bucket)!.push(availability);
  }
  for (const list of byBucket.values()) {
    list.sort(
      (a, b) => new Date(notificationDate(b)).getTime() - new Date(notificationDate(a)).getTime()
    );
  }

  const groups: NotificationGroup[] = BUCKET_ORDER.filter((bucket) => byBucket.has(bucket)).map(
    (bucket) => ({
      bucket,
      items: byBucket.get(bucket)!.map((availability) => ({
        availability,
        product: mockProducts.find((p) => p.id === availability.productId)!,
        store: mockStores.find((s) => s.id === availability.storeId)!,
        isRead: mockCurrentUser.readNotificationIds.includes(availability.id),
      })),
    })
  );

  return (
    <div className="flex flex-1 flex-col">
      <SuivreProduitDialog products={mockProducts} />

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
        <NotificationsList groups={groups} allIds={followedAvailabilities.map((a) => a.id)} />
      )}
    </div>
  );
}
