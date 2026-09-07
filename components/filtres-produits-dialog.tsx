"use client";

import { SlidersHorizontal } from "lucide-react";
import { useMemo } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { distinctSeries, languageOptions, productTypeLabels, setNamesForSeries } from "@/lib/product-options";
import type { Product, ProductType } from "@/lib/types";

export type StockFilter = "en-stock" | "Rupture" | "";

export interface ProductFilters {
  type: ProductType | "";
  series: string;
  setName: string;
  language: string;
  quantity: StockFilter;
}

export const emptyFilters: ProductFilters = {
  type: "",
  series: "",
  setName: "",
  language: "",
  quantity: "",
};

export function countActiveFilters(filters: ProductFilters): number {
  return Object.values(filters).filter(Boolean).length;
}

// Radix Select interdit une SelectItem avec value="" : ce sentinel représente "Tous/Toutes".
const ALL = "__all__";

export function FiltresProduitsDialog({
  products,
  filters,
  onFiltersChange,
}: {
  products: Product[];
  filters: ProductFilters;
  onFiltersChange: (filters: ProductFilters) => void;
}) {
  const seriesOptions = useMemo(() => distinctSeries(products), [products]);
  const setNameOptions = useMemo(
    () => setNamesForSeries(products, filters.series),
    [products, filters.series]
  );

  const activeCount = countActiveFilters(filters);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="icon" className="relative shrink-0">
          <SlidersHorizontal className="size-4" />
          {activeCount > 0 && (
            <Badge className="absolute -top-1.5 -right-1.5 size-4 shrink-0 rounded-full p-0 text-[10px]">
              {activeCount}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Filtres</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Type</label>
            <Select
              value={filters.type || ALL}
              onValueChange={(value) =>
                onFiltersChange({ ...filters, type: value === ALL ? "" : (value as ProductType) })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Tous les types</SelectItem>
                {Object.entries(productTypeLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Série</label>
            <Select
              value={filters.series || ALL}
              onValueChange={(value) =>
                onFiltersChange({
                  ...filters,
                  series: value === ALL ? "" : value,
                  setName: "",
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Toutes les séries</SelectItem>
                {seriesOptions.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Extension</label>
            <Select
              value={filters.setName || ALL}
              onValueChange={(value) =>
                onFiltersChange({ ...filters, setName: value === ALL ? "" : value })
              }
              disabled={setNameOptions.length === 0}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={setNameOptions.length === 0 ? "Choisis d'abord une série" : undefined}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Toutes les extensions</SelectItem>
                {setNameOptions.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Langue</label>
            <Select
              value={filters.language || ALL}
              onValueChange={(value) =>
                onFiltersChange({ ...filters, language: value === ALL ? "" : value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Toutes les langues</SelectItem>
                {languageOptions.map((l) => (
                  <SelectItem key={l} value={l}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Quantité</label>
            <Select
              value={filters.quantity || ALL}
              onValueChange={(value) =>
                onFiltersChange({ ...filters, quantity: value === ALL ? "" : (value as StockFilter) })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Toutes les quantités</SelectItem>
                <SelectItem value="en-stock">En stock</SelectItem>
                <SelectItem value="Rupture">Rupture</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={activeCount === 0}
            onClick={() => onFiltersChange(emptyFilters)}
          >
            Réinitialiser
          </Button>
          <DialogClose asChild>
            <Button type="button">Voir les résultats</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
