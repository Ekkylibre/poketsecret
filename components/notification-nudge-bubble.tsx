"use client";

import { useNotificationPermission } from "@/components/notification-permission-toggle";

/** Incitation flottante au-dessus du toggle notifications, pointe vers lui : n'apparaît
 *  que pour un compte Premium (les notifications sont une feature Premium) qui n'a pas
 *  encore activé les notifs, et jamais si le navigateur les a définitivement bloquées
 *  (relancer serait inutile). */
export function NotificationNudgeBubble({ isPremium }: { isPremium: boolean }) {
  const { support, enabled, enable } = useNotificationPermission();

  if (!isPremium || enabled || support === "unsupported" || support === "denied") return null;

  return (
    <button
      type="button"
      onClick={enable}
      className="bg-popover text-popover-foreground animate-fade-in-up absolute -top-11 right-3 z-10 flex max-w-48 items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs shadow-lg"
    >
      Active-moi pour ne rien rater d&apos;une dispo !
      <span
        aria-hidden
        className="bg-popover absolute -bottom-1.5 right-5 size-3 rotate-45 border-r border-b"
      />
    </button>
  );
}
