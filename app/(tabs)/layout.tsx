import { BottomNav } from "@/components/bottom-nav";
import { LocationProvider } from "@/components/location-provider";
import { getUnreadNotificationCount } from "@/lib/notifications";

// Ce layout englobe tous les onglets et affiche le compteur de notifications non lues sur
// la pastille du bas : sans rendu dynamique, il resterait figé sur le nombre du premier
// chargement au lieu de suivre les server actions dismiss/markRead.
export const dynamic = "force-dynamic";

export default function TabsLayout({ children }: { children: React.ReactNode }) {
  const unreadCount = getUnreadNotificationCount();

  return (
    <LocationProvider>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pb-3">{children}</div>
      <BottomNav unreadCount={unreadCount} />
    </LocationProvider>
  );
}
