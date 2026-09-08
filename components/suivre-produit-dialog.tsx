"use client";

import { Boxes, Check, Gift, type LucideIcon, MoreHorizontal, Package, Plus } from "lucide-react";
import { type FormEvent, useActionState, useMemo, useState } from "react";

import { suivreNouveauProduit } from "@/app/(tabs)/magasins/actions";
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
import { Input } from "@/components/ui/input";
import { distinctSeries, productTypeLabels, setNamesForSeries } from "@/lib/product-options";
import type { Product, ProductType } from "@/lib/types";
import { cn } from "@/lib/utils";

const ALL_TYPES = Object.keys(productTypeLabels) as ProductType[];

const typeIcons: Record<ProductType, LucideIcon> = {
  booster: Package,
  coffret: Gift,
  display: Boxes,
  autre: MoreHorizontal,
};

const typeTileColors: Record<ProductType, string> = {
  booster: "from-sky-600 to-sky-900",
  coffret: "from-amber-600 to-amber-900",
  display: "from-violet-600 to-violet-900",
  autre: "from-slate-600 to-slate-800",
};

// Couleur déterministe (même nom → même teinte) tant qu'on n'a pas de vraies images de
// série/extension — sert juste à distinguer les tuiles visuellement dans la grille.
function hashHue(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = value.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
}

function CoverTile({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  const hue = hashHue(label);
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex aspect-square flex-col items-start justify-end overflow-hidden rounded-lg p-2 text-left shadow-sm"
      style={{
        backgroundImage: `linear-gradient(135deg, hsl(${hue} 65% 42%), hsl(${(hue + 45) % 360} 65% 24%))`,
      }}
    >
      <span className="line-clamp-2 text-xs font-semibold text-white drop-shadow">{label}</span>
    </button>
  );
}

function NewTile({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="border-input text-muted-foreground hover:bg-accent flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border border-dashed"
    >
      <Plus className="size-5" />
      <span className="text-xs">{label}</span>
    </button>
  );
}

function TypeTile({
  type,
  selected,
  onClick,
}: {
  type: ProductType;
  selected: boolean;
  onClick: () => void;
}) {
  const Icon = typeIcons[type];
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex aspect-square flex-col items-center justify-center gap-1.5 overflow-hidden rounded-lg bg-gradient-to-br text-white shadow-sm ring-2 ring-transparent transition",
        typeTileColors[type],
        selected && "ring-primary"
      )}
    >
      <Icon className="size-6" />
      <span className="text-xs font-semibold">{productTypeLabels[type]}</span>
      {selected && (
        <span className="bg-primary text-primary-foreground absolute top-1.5 right-1.5 flex size-5 items-center justify-center rounded-full">
          <Check className="size-3" />
        </span>
      )}
    </button>
  );
}

export function SuivreProduitDialog({ products }: { products: Product[] }) {
  const [open, setOpen] = useState(false);
  const [handledSuccess, setHandledSuccess] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [series, setSeries] = useState("");
  const [setName, setSetName] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<ProductType[]>([]);
  const [seriesInputMode, setSeriesInputMode] = useState(false);
  const [seriesInput, setSeriesInput] = useState("");
  const [setNameInputMode, setSetNameInputMode] = useState(false);
  const [setNameInput, setSetNameInput] = useState("");
  const [state, formAction, isPending] = useActionState(suivreNouveauProduit, null);

  const seriesOptions = useMemo(() => distinctSeries(products), [products]);
  const setNameOptions = useMemo(() => setNamesForSeries(products, series), [products, series]);

  function resetForm() {
    setStep(1);
    setSeries("");
    setSetName("");
    setSelectedTypes([]);
    setSeriesInputMode(false);
    setSeriesInput("");
    setSetNameInputMode(false);
    setSetNameInput("");
  }

  function toggleType(type: ProductType) {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  }

  function toggleAllTypes() {
    setSelectedTypes((prev) => (prev.length === ALL_TYPES.length ? [] : ALL_TYPES));
  }

  if (state?.success && !handledSuccess) {
    setHandledSuccess(true);
    setOpen(false);
    resetForm();
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) setHandledSuccess(false);
    else resetForm();
  }

  function selectSeries(value: string) {
    setSeries(value);
    setSetName("");
    setSetNameInputMode(setNamesForSeries(products, value).length === 0);
    setStep(2);
  }

  function confirmSeriesInput(e: FormEvent) {
    e.preventDefault();
    const value = seriesInput.trim();
    if (!value) return;
    selectSeries(value);
  }

  function selectSetName(value: string) {
    setSetName(value);
    setStep(3);
  }

  function confirmSetNameInput(e: FormEvent) {
    e.preventDefault();
    const value = setNameInput.trim();
    if (!value) return;
    selectSetName(value);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          className="fixed right-4 bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] z-20 h-12 gap-1.5 rounded-full pr-5 pl-4 shadow-lg"
        >
          <Plus className="size-5" />
          Suivre un produit
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Suivre un produit</DialogTitle>
        </DialogHeader>

        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="series" value={series} />
          <input type="hidden" name="setName" value={setName} />
          {selectedTypes.map((t) => (
            <input key={t} type="hidden" name="type" value={t} />
          ))}

          <div className="flex gap-1.5">
            <div className={cn("h-1.5 flex-1 rounded-full", step >= 1 ? "bg-primary" : "bg-muted")} />
            <div className={cn("h-1.5 flex-1 rounded-full", step >= 2 ? "bg-primary" : "bg-muted")} />
            <div className={cn("h-1.5 flex-1 rounded-full", step >= 3 ? "bg-primary" : "bg-muted")} />
          </div>

          <p className="text-muted-foreground text-xs">
            Pas encore vu en magasin ? Suis-le quand même : tu seras alerté dès qu&apos;il sera
            signalé quelque part.
          </p>

          <div className="overflow-hidden">
            <div
              className="flex transition-transform duration-300 ease-in-out"
              style={{ transform: `translateX(-${(step - 1) * 100}%)` }}
            >
              <div className="flex w-full shrink-0 flex-col gap-2">
                <span className="text-sm font-medium">Choisis une série</span>
                <div className="grid grid-cols-3 gap-2">
                  {seriesOptions.map((s) => (
                    <CoverTile key={s} label={s} onClick={() => selectSeries(s)} />
                  ))}
                  {!seriesInputMode && (
                    <NewTile label="Nouvelle" onClick={() => setSeriesInputMode(true)} />
                  )}
                </div>
                {seriesInputMode && (
                  <div className="flex gap-2">
                    <Input
                      value={seriesInput}
                      onChange={(e) => setSeriesInput(e.target.value)}
                      placeholder="Écarlate et Violet"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") confirmSeriesInput(e);
                      }}
                    />
                    <Button type="button" onClick={confirmSeriesInput}>
                      Valider
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex w-full shrink-0 flex-col gap-2">
                <span className="text-sm font-medium">Choisis une extension — {series}</span>
                <div className="grid grid-cols-3 gap-2">
                  {setNameOptions.map((s) => (
                    <CoverTile key={s} label={s} onClick={() => selectSetName(s)} />
                  ))}
                  {!setNameInputMode && (
                    <NewTile label="Nouvelle" onClick={() => setSetNameInputMode(true)} />
                  )}
                </div>
                {setNameInputMode && (
                  <div className="flex gap-2">
                    <Input
                      value={setNameInput}
                      onChange={(e) => setSetNameInput(e.target.value)}
                      placeholder="Évolutions Prismatiques"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") confirmSetNameInput(e);
                      }}
                    />
                    <Button type="button" onClick={confirmSetNameInput}>
                      Valider
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex w-full shrink-0 flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Choisis un ou plusieurs types</span>
                  <button
                    type="button"
                    onClick={toggleAllTypes}
                    className="text-primary text-xs font-medium underline underline-offset-2"
                  >
                    {selectedTypes.length === ALL_TYPES.length
                      ? "Tout désélectionner"
                      : "Tout sélectionner"}
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {ALL_TYPES.map((t) => (
                    <TypeTile
                      key={t}
                      type={t}
                      selected={selectedTypes.includes(t)}
                      onClick={() => toggleType(t)}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {state?.error && <p className="text-destructive text-sm">{state.error}</p>}

          <DialogFooter>
            {step === 1 ? (
              <div key="step-1" className="flex flex-1 gap-2">
                <DialogClose asChild>
                  <Button type="button" variant="outline" className="flex-1">
                    Annuler
                  </Button>
                </DialogClose>
              </div>
            ) : (
              <div key={`step-${step}`} className="flex flex-1 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setStep((step - 1) as 1 | 2)}
                >
                  Retour
                </Button>
                {step === 3 && (
                  <Button
                    type="submit"
                    disabled={isPending || selectedTypes.length === 0}
                    className="flex-1"
                  >
                    {isPending
                      ? "Ajout..."
                      : selectedTypes.length > 1
                        ? `Suivre (${selectedTypes.length})`
                        : "Suivre"}
                  </Button>
                )}
              </div>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
