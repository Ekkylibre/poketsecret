"use server";

import { revalidatePath } from "next/cache";

import { mockCurrentUser } from "@/lib/mock-data";

export async function dismissNotification(availabilityId: string) {
  if (!mockCurrentUser.dismissedNotificationIds.includes(availabilityId)) {
    mockCurrentUser.dismissedNotificationIds.push(availabilityId);
  }
  revalidatePath("/notifications");
  return { success: true };
}
