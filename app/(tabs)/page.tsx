import { CarteExplorer } from "@/components/carte-explorer";
import { mockStores } from "@/lib/mock-data";

export default function CartePage() {
  return <CarteExplorer stores={mockStores} />;
}
