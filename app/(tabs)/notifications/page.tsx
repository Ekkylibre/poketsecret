import { Bell } from "lucide-react";

import { NotificationRow } from "@/components/notification-row";
import { dateBucket, type DateBucket } from "@/lib/confidence";
import { mockAvailabilities, mockCurrentUser, mockProducts, mockStores } from "@/lib/mock-data";
import type { Availability } from "@/lib/types";

const BUCKET_ORDER: DateBucket[] = ["Aujourd'hui", "Hier", "7 derniers jours", "Plus ancien"];

function notificationDate(availability: Availability): string {
  return availability.lastModifiedAt ?? availability.reportedAt;
}

export default function NotificationsPage() {
  const followedAvailabilities = mockAvailabilities.filter(
    (a) =>
      mockCurrentUser.followedProductIds.includes(a.productId) &&
      !mockCurrentUser.dismissedNotificationIds.includes(a.id)
  );

  const groups = new Map<DateBucket, Availability[]>();
  for (const availability of followedAvailabilities) {
    const bucket = dateBucket(notificationDate(availability));
    if (!groups.has(bucket)) groups.set(bucket, []);
    groups.get(bucket)!.push(availability);
  }
  for (const list of groups.values()) {
    list.sort(
      (a, b) => new Date(notificationDate(b)).getTime() - new Date(notificationDate(a)).getTime()
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      {followedAvailabilities.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
          <div className="bg-muted flex size-14 items-center justify-center rounded-full">
            <Bell className="text-muted-foreground size-5" />
          </div>
          <p className="text-muted-foreground text-sm">
            Suis des produits depuis la carte ou les magasins pour être alerté ici.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4 p-4">
          {BUCKET_ORDER.filter((bucket) => groups.has(bucket)).map((bucket) => (
            <div key={bucket} className="flex flex-col gap-2">
              <h2 className="text-muted-foreground text-sm font-medium">{bucket}</h2>
              <div className="flex flex-col gap-2">
                {groups.get(bucket)!.map((availability) => {
                  const product = mockProducts.find((p) => p.id === availability.productId)!;
                  const store = mockStores.find((s) => s.id === availability.storeId)!;
                  return (
                    <NotificationRow
                      key={availability.id}
                      availability={availability}
                      product={product}
                      store={store}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
