import { BottomNav } from "@/components/bottom-nav";
import { LocationProvider } from "@/components/location-provider";

export default function TabsLayout({ children }: { children: React.ReactNode }) {
  return (
    <LocationProvider>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pb-3">{children}</div>
      <BottomNav />
    </LocationProvider>
  );
}
