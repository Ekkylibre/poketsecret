import { mockAvailabilities, mockCurrentUser } from "@/lib/mock-data";
import type { Availability } from "@/lib/types";

export function notificationDate(availability: Availability): string {
  return availability.lastModifiedAt ?? availability.reportedAt;
}

export function isProductTriggered(availability: Availability): boolean {
  return mockCurrentUser.followedProductIds.includes(availability.productId);
}

/** Ne compte que le réassort/nouveauté survenu après le suivi du magasin — sinon suivre un
 *  magasin ferait remonter d'un coup tout son stock existant en "notification". */
export function isStoreTriggered(availability: Availability): boolean {
  const since = mockCurrentUser.followedStoreSince[availability.storeId];
  if (!since) return false;
  return new Date(notificationDate(availability)).getTime() > new Date(since).getTime();
}

export function getFollowedAvailabilities(): Availability[] {
  return mockAvailabilities.filter(
    (a) =>
      (isProductTriggered(a) || isStoreTriggered(a)) &&
      !mockCurrentUser.dismissedNotificationIds.includes(a.id)
  );
}

export function getUnreadNotificationCount(): number {
  return getFollowedAvailabilities().filter(
    (a) => !mockCurrentUser.readNotificationIds.includes(a.id)
  ).length;
}
