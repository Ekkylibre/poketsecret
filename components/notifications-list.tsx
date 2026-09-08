"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

import { dismissAllNotifications, markNotificationsRead } from "@/app/(tabs)/notifications/actions";
import { ClearNotificationsButton } from "@/components/clear-notifications-button";
import { NotificationRow } from "@/components/notification-row";
import type { DateBucket } from "@/lib/confidence";
import type { Availability, Product, Store } from "@/lib/types";

export interface NotificationItem {
  availability: Availability;
  product: Product;
  store: Store;
  isRead: boolean;
}

export interface NotificationGroup {
  bucket: DateBucket;
  items: NotificationItem[];
}

// Délai entre le départ de chaque notification lors du "Tout effacer" (cascade plutôt
// que toutes les cartes qui partent d'un coup).
const CLEAR_ALL_STAGGER_MS = 60;

export function NotificationsList({
  groups,
  allIds,
}: {
  groups: NotificationGroup[];
  allIds: string[];
}) {
  // Snapshot pris au montage : une fois affichée, la liste ne se réduit plus toute seule
  // quand le serveur revalide après un dismiss (quasi instantané sur données mock) — sinon
  // ça coupe l'animation de sortie que NotificationRow gère elle-même en local.
  const [frozenGroups] = useState(groups);
  const [readIds, setReadIds] = useState(
    () => new Set(frozenGroups.flatMap((g) => g.items.filter((i) => i.isRead).map((i) => i.availability.id)))
  );
  const [clearingAll, setClearingAll] = useState(false);
  const [, startTransition] = useTransition();

  // Ordre d'affichage figé au montage : sert à décaler la sortie de chaque carte lors
  // du "Tout effacer" (la première notification part la première).
  const exitOrder = useMemo(() => {
    const order = new Map<string, number>();
    let i = 0;
    for (const group of frozenGroups) {
      for (const item of group.items) order.set(item.availability.id, i++);
    }
    return order;
  }, [frozenGroups]);

  // Ouvrir l'onglet vaut "vu" pour tout ce qui est affiché — volontairement découplé du clic
  // sur une notification (qui, lui, ouvre le magasin) pour ne pas mélanger les deux gestes.
  // Léger délai pour laisser l'utilisateur percevoir ce qui était non lu avant que ça bascule.
  useEffect(() => {
    const unreadIds = frozenGroups
      .flatMap((g) => g.items)
      .map((i) => i.availability.id)
      .filter((id) => !readIds.has(id));
    if (unreadIds.length === 0) return;

    const timeout = setTimeout(() => {
      setReadIds((prev) => new Set([...prev, ...unreadIds]));
      startTransition(async () => {
        await markNotificationsRead(unreadIds);
      });
    }, 1200);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ne doit tourner qu'une fois, sur le lot figé au montage
  }, []);

  function handleClearAll() {
    setClearingAll(true);
    // La liste reste "frozen" (voir plus haut) donc rien ne bouge chez elle quand le
    // serveur revalide, mais `page.tsx` (parent) démonterait toute la liste dès que
    // dismissedNotificationIds devient complet — ce qui coupe la cascade en plein vol
    // vu la latence quasi nulle des données mock. On attend donc la fin de l'animation
    // (dernier délai + durée de la transition de sortie) avant d'appeler le serveur.
    // Chaque carte joue le slide (0.2s) puis l'effondrement de hauteur (0.2s) avant de
    // se démonter — la dernière carte lancée doit avoir fini les deux avant d'appeler
    // le serveur, sinon la page bascule sur l'état vide en plein milieu de la cascade.
    const totalDurationMs = exitOrder.size * CLEAR_ALL_STAGGER_MS + 450;
    setTimeout(() => {
      startTransition(async () => {
        await dismissAllNotifications(allIds);
      });
    }, totalDurationMs);
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      {frozenGroups.map((group, i) => (
        <div key={group.bucket} className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h2 className="text-muted-foreground text-sm font-medium">{group.bucket}</h2>
            {i === 0 && <ClearNotificationsButton onConfirm={handleClearAll} />}
          </div>
          <div className="flex flex-col gap-2">
            {group.items.map((item) => (
              <NotificationRow
                key={item.availability.id}
                availability={item.availability}
                product={item.product}
                store={item.store}
                isRead={readIds.has(item.availability.id)}
                exitDelayMs={
                  clearingAll ? exitOrder.get(item.availability.id)! * CLEAR_ALL_STAGGER_MS : undefined
                }
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
