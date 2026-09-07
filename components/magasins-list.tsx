"use client";

import {
  ArrowUpDown,
  ChevronDown,
  Clock,
  CreditCard,
  Package,
  Ruler,
  Search,
  Store as StoreIcon,
  X,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { AjouterProduitDialog } from "@/components/produit-dialog";
import { AvailabilityCard } from "@/components/availability-card";
import {
  countActiveFilters,
  emptyFilters,
  FiltresProduitsDialog,
  type ProductFilters,
} from "@/components/filtres-produits-dialog";
import { FavoriteStoreButton } from "@/components/favorite-store-button";
import { useLocation } from "@/components/location-provider";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatDayHours, getTodayWeekday } from "@/lib/hours";
import { productTypeLabels } from "@/lib/product-options";
import type { Availability, DayHours, Product, Store } from "@/lib/types";
import { cn, formatStoreAddress } from "@/lib/utils";

const stockFilterLabels: Record<"en-stock" | "Rupture", string> = {
  "en-stock": "En stock",
  Rupture: "Rupture",
};

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <button
      type="button"
      onClick={onRemove}
      className="border-primary/40 bg-primary/10 text-primary flex shrink-0 items-center gap-1 rounded-full border py-1 pr-1.5 pl-2.5 text-xs font-medium whitespace-nowrap"
    >
      {label}
      <X className="size-3" />
    </button>
  );
}

function matchesFilters(
  availability: Availability,
  product: Product | undefined,
  filters: ProductFilters
): boolean {
  if (!product) return false;
  if (filters.type && product.type !== filters.type) return false;
  if (filters.series && product.series !== filters.series) return false;
  if (filters.setName && product.setName !== filters.setName) return false;
  if (filters.language && availability.language !== filters.language) return false;
  if (filters.quantity) {
    const isRupture = availability.quantity === "Rupture";
    if (filters.quantity === "Rupture" && !isRupture) return false;
    if (filters.quantity === "en-stock" && isRupture) return false;
  }
  return true;
}

type SortField = "date" | "price" | null;
type SortDir = "asc" | "desc";

function productSearchLabel(product: Product) {
  return `${product.name} ${product.setName} ${product.series}`.toLowerCase();
}

function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function SortButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-colors",
        active ? "border-primary text-primary" : "text-muted-foreground hover:bg-accent"
      )}
    >
      {icon}
      {label}
      {active && <ArrowUpDown className="size-3.5" />}
    </button>
  );
}

function StoreCard({
  store,
  hoursToday,
  storeAvailabilities,
  products,
  isFavorite,
  isExpanded,
  onToggle,
}: {
  store: Store;
  hoursToday?: DayHours;
  storeAvailabilities: Availability[];
  products: Product[];
  isFavorite: boolean;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  function handleSort(field: Exclude<SortField, null>) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir(field === "date" ? "desc" : "asc");
    }
  }

  const sortedAvailabilities = useMemo(() => {
    return [...storeAvailabilities].sort((a, b) => {
      const pinDiff = (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0);
      if (pinDiff !== 0) return pinDiff;

      if (sortField === "date") {
        const diff = new Date(a.reportedAt).getTime() - new Date(b.reportedAt).getTime();
        return sortDir === "asc" ? diff : -diff;
      }
      if (sortField === "price") {
        const diff = (a.price ?? 0) - (b.price ?? 0);
        return sortDir === "asc" ? diff : -diff;
      }
      return 0;
    });
  }, [storeAvailabilities, sortField, sortDir]);

  return (
    <Card className="hover:bg-white/3 gap-0 p-3 transition-colors">
      <div
        className={cn(
          "hover:bg-accent/30 -m-3 flex cursor-pointer items-center gap-3 p-3 transition-colors",
          isExpanded ? "rounded-t-xl" : "rounded-xl"
        )}
      >
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isExpanded}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <div className="bg-muted flex size-11 shrink-0 items-center justify-center rounded-lg">
            <StoreIcon className="text-muted-foreground size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{store.name}</p>
            <p className="text-muted-foreground truncate text-xs">{formatStoreAddress(store)}</p>
            <p className="text-muted-foreground/70 mt-0.5 flex items-center gap-1 text-xs">
              <Clock className="size-3 shrink-0" />
              {hoursToday ? formatDayHours(hoursToday) : "Horaires non renseignés"}
            </p>
          </div>
        </button>
        <div className="flex items-center gap-1">
          <FavoriteStoreButton storeId={store.id} initialFavorite={isFavorite} className="self-start" />
          <div className="flex flex-col items-center gap-1">
            <AjouterProduitDialog storeId={store.id} products={products} />
            <button
              type="button"
              onClick={onToggle}
              aria-label={isExpanded ? "Replier les produits" : "Voir les produits"}
              aria-expanded={isExpanded}
              className="text-muted-foreground hover:bg-accent flex size-8 shrink-0 items-center justify-center rounded-md"
            >
              <ChevronDown className={cn("size-4 transition-transform", isExpanded && "rotate-180")} />
            </button>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="-mx-3 mt-3 border-t px-3 pt-3">
          {storeAvailabilities.length === 0 ? (
            <p className="text-muted-foreground text-sm">Aucun produit signalé pour l&apos;instant.</p>
          ) : (
            <>
              <div className="mb-3 flex justify-end gap-2">
                <SortButton
                  active={sortField === "date"}
                  onClick={() => handleSort("date")}
                  icon={<Clock className="size-4" />}
                  label="Date"
                />
                <SortButton
                  active={sortField === "price"}
                  onClick={() => handleSort("price")}
                  icon={<CreditCard className="size-4" />}
                  label="Prix"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {sortedAvailabilities.map((availability) => {
                  const product = products.find((p) => p.id === availability.productId);
                  if (!product) return null;
                  return (
                    <AvailabilityCard
                      key={availability.id}
                      availability={availability}
                      product={product}
                      storeId={store.id}
                      products={products}
                    />
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </Card>
  );
}

export function MagasinsList({
  stores,
  availabilities,
  products,
  favoriteStoreIds,
}: {
  stores: Store[];
  availabilities: Availability[];
  products: Product[];
  favoriteStoreIds: string[];
}) {
  const { center, radiusKm } = useLocation();
  const [query, setQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<ProductFilters>(emptyFilters);

  const today = getTodayWeekday();

  function toggleExpanded(storeId: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(storeId)) next.delete(storeId);
      else next.add(storeId);
      return next;
    });
  }

  function selectSuggestion(text: string) {
    setQuery(text);
    setShowSuggestions(false);
  }

  const storesInRadius = useMemo(
    () => stores.filter((s) => (s.lat !== 0 || s.lng !== 0) && distanceKm(center, s) <= radiusKm),
    [stores, center, radiusKm]
  );

  const trimmedQuery = query.trim().toLowerCase();

  const filteredAvailabilities = useMemo(() => {
    if (countActiveFilters(filters) === 0) return availabilities;
    return availabilities.filter((a) =>
      matchesFilters(a, products.find((p) => p.id === a.productId), filters)
    );
  }, [availabilities, products, filters]);

  const storeMatches = useMemo(() => {
    if (!trimmedQuery) return [];
    return storesInRadius.filter((s) => s.name.toLowerCase().includes(trimmedQuery)).slice(0, 5);
  }, [storesInRadius, trimmedQuery]);

  const productMatches = useMemo(() => {
    if (!trimmedQuery) return [];
    const storeIdsInRadius = new Set(storesInRadius.map((s) => s.id));
    const storeIdsByProduct = new Map<string, Set<string>>();
    for (const a of filteredAvailabilities) {
      if (!storeIdsInRadius.has(a.storeId)) continue;
      const product = products.find((p) => p.id === a.productId);
      if (!product || !productSearchLabel(product).includes(trimmedQuery)) continue;
      if (!storeIdsByProduct.has(product.id)) storeIdsByProduct.set(product.id, new Set());
      storeIdsByProduct.get(product.id)!.add(a.storeId);
    }
    return Array.from(storeIdsByProduct.entries())
      .map(([productId, storeIds]) => ({
        product: products.find((p) => p.id === productId)!,
        storeCount: storeIds.size,
      }))
      .slice(0, 5);
  }, [filteredAvailabilities, storesInRadius, products, trimmedQuery]);

  const activeFilterCount = countActiveFilters(filters);

  const visibleStores = useMemo(() => {
    return storesInRadius
      .filter((s) => {
        if (activeFilterCount > 0 && !filteredAvailabilities.some((a) => a.storeId === s.id)) {
          return false;
        }
        if (!trimmedQuery) return true;
        if (s.name.toLowerCase().includes(trimmedQuery)) return true;
        return filteredAvailabilities.some((a) => {
          if (a.storeId !== s.id) return false;
          const product = products.find((p) => p.id === a.productId);
          return product ? productSearchLabel(product).includes(trimmedQuery) : false;
        });
      })
      .sort((a, b) => distanceKm(center, a) - distanceKm(center, b));
  }, [storesInRadius, trimmedQuery, filteredAvailabilities, products, center, activeFilterCount]);

  return (
    <div className="flex flex-1 flex-col">
      <header className="bg-background sticky top-0 z-10 flex flex-col gap-3 border-b p-4">
        <div className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              type="search"
              placeholder="Rechercher un magasin ou un produit..."
              className="pl-9"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 100)}
            />

            {showSuggestions && trimmedQuery && (storeMatches.length > 0 || productMatches.length > 0) && (
              <div className="bg-popover absolute inset-x-0 top-full z-20 mt-1 flex flex-col gap-0.5 rounded-md border p-1 shadow-lg">
                {storeMatches.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => selectSuggestion(s.name)}
                    className="hover:bg-accent flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm"
                  >
                    <StoreIcon className="text-muted-foreground size-4 shrink-0" />
                    <span className="min-w-0 flex-1 truncate">{s.name}</span>
                  </button>
                ))}
                {productMatches.map(({ product, storeCount }) => (
                  <button
                    key={product.id}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => selectSuggestion(`${product.name} ${product.setName}`)}
                    className="hover:bg-accent flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm"
                  >
                    <Package className="text-muted-foreground size-4 shrink-0" />
                    <span className="min-w-0 flex-1 truncate">
                      {product.name} {product.setName}
                    </span>
                    <span className="text-muted-foreground shrink-0 text-xs">
                      {storeCount} magasin{storeCount > 1 ? "s" : ""}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <FiltresProduitsDialog products={products} filters={filters} onFiltersChange={setFilters} />
        </div>

        <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto">
          <Link
            href="/"
            className="border-input bg-background text-muted-foreground flex shrink-0 items-center gap-1 rounded-full border py-1 pr-2.5 pl-2 text-xs font-medium whitespace-nowrap"
          >
            <Ruler className="size-3" />
            {radiusKm} km
          </Link>
          {filters.type && (
            <FilterChip
              label={productTypeLabels[filters.type]}
              onRemove={() => setFilters({ ...filters, type: "" })}
            />
          )}
          {filters.series && (
            <FilterChip
              label={filters.series}
              onRemove={() => setFilters({ ...filters, series: "", setName: "" })}
            />
          )}
          {filters.setName && (
            <FilterChip
              label={filters.setName}
              onRemove={() => setFilters({ ...filters, setName: "" })}
            />
          )}
          {filters.language && (
            <FilterChip
              label={filters.language}
              onRemove={() => setFilters({ ...filters, language: "" })}
            />
          )}
          {filters.quantity && (
            <FilterChip
              label={stockFilterLabels[filters.quantity]}
              onRemove={() => setFilters({ ...filters, quantity: "" })}
            />
          )}
        </div>
      </header>

      <div className="flex flex-col gap-2 p-4">
        {visibleStores.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {trimmedQuery
              ? `Aucun résultat pour « ${query.trim()} ».`
              : activeFilterCount > 0
                ? "Aucun produit ne correspond à ces filtres."
                : "Aucun magasin dans ce rayon."}
          </p>
        ) : (
          <>
            <p className="text-muted-foreground -mt-1 mb-1 text-xs">
              {visibleStores.length} magasin{visibleStores.length > 1 ? "s" : ""} à proximité
            </p>

            {visibleStores.map((store) => (
              <StoreCard
                key={store.id}
                store={store}
                hoursToday={store.hours?.[today]}
                storeAvailabilities={filteredAvailabilities.filter((a) => a.storeId === store.id)}
                products={products}
                isFavorite={favoriteStoreIds.includes(store.id)}
                isExpanded={expandedIds.has(store.id)}
                onToggle={() => toggleExpanded(store.id)}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
