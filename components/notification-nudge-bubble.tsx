"use client";

import { useNotificationPermission } from "@/components/notification-permission-toggle";

/** Incitation flottante au-dessus du toggle notifications, pointe vers lui (flèche vers
 *  le bas). N'apparaît que pour un compte Premium (les notifications sont une feature
 *  Premium) qui n'a pas encore activé les notifs, et jamais si le navigateur les a
 *  définitivement bloquées (relancer serait inutile). */
export function NotificationNudgeBubble({ isPremium }: { isPremium: boolean }) {
  const { support, enabled, enable } = useNotificationPermission();

  if (!isPremium || enabled || support === "unsupported" || support === "denied") return null;

  return (
    <button
      type="button"
      onClick={enable}
      className="bg-popover text-popover-foreground animate-fade-in-up absolute bottom-full right-0 z-10 mb-2 flex max-w-40 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-left text-[11px] leading-tight shadow-lg"
    >
      Active-moi pour ne rien rater d&apos;une dispo !
      <span
        aria-hidden
        className="bg-popover absolute -bottom-1.5 right-3 size-3 rotate-45 border-r border-b"
      />
    </button>
  );
}
