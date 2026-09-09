"use client";

import { Check, ImageOff, Plus } from "lucide-react";
import { useActionState, useMemo, useState } from "react";

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
import {
  distinctSeries,
  languageAbbreviations,
  languageOptions,
  productTypeLabels,
  setNamesForSeries,
  type SeriesExtensionPair,
} from "@/lib/product-options";
import type { Product, ProductType } from "@/lib/types";
import { cn } from "@/lib/utils";

// Suivre un produit suit désormais tous les types d'une extension d'un coup (un
// collectionneur veut tout ce qui sort de "151", pas cocher booster/display un par un) :
// plus de sélection manuelle de type, juste la liste utilisée pour créer une entrée de
// suivi par type existant.
const ALL_TYPES = Object.keys(productTypeLabels) as ProductType[];

// Sépare série et extension dans les clés des Map de logos, sans risque de collision
// avec un nom qui contiendrait un espace.
function logoKey(series: string, setName: string): string {
  return series + "|||" + setName;
}

// Couleur déterministe (même nom → même teinte), utilisée en secours quand TCGdex n'a
// pas encore de logo pour cette série/extension.
function hashHue(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = value.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
}

function CoverTile({
  label,
  logoUrl,
  onClick,
}: {
  label: string;
  /** Logo TCGdex de la série/extension, absent pour certaines (fallback couleur générée). */
  logoUrl?: string;
  onClick: () => void;
}) {
  const hue = hashHue(label);
  // TCGdex ne sert pas toujours de .png pour les sets plus anciens (seulement .webp/.jpg
  // selon le set) : logoUrl peut donc pointer vers une image en 404 sans qu'on le sache
  // à l'avance. onError bascule alors sur le même repli que si logoUrl était absent.
  const [failed, setFailed] = useState(false);
  const showLogo = logoUrl && !failed;
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex aspect-square flex-col items-start justify-end overflow-hidden rounded-lg p-2 text-left shadow-sm"
      style={
        showLogo
          ? undefined
          : {
              backgroundImage: `linear-gradient(135deg, hsl(${hue} 65% 42%), hsl(${(hue + 45) % 360} 65% 24%))`,
            }
      }
    >
      {showLogo ? (
        <>
          <div className="bg-muted absolute inset-0" />
          {/* eslint-disable-next-line @next/next/no-img-element -- logo TCGdex externe, domaine tiers non configuré pour next/image */}
          <img
            src={logoUrl}
            alt=""
            onError={() => setFailed(true)}
            className="absolute inset-0 h-full w-full object-contain p-2"
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent" />
        </>
      ) : (
        <ImageOff className="absolute top-1/2 left-1/2 size-6 -translate-x-1/2 -translate-y-1/2 text-white/70" />
      )}
      <span className="relative line-clamp-2 text-xs font-semibold text-white drop-shadow">{label}</span>
    </button>
  );
}

export function SuivreProduitDialog({
  products,
  referenceExtensions = [],
}: {
  products: Product[];
  /** Référentiel série/extension (TCGdex) : permet de suivre une extension qui vient
   *  de sortir avant même qu'un contributeur l'ait signalée en magasin. */
  referenceExtensions?: SeriesExtensionPair[];
}) {
  const [open, setOpen] = useState(false);
  const [handledSuccess, setHandledSuccess] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [series, setSeries] = useState("");
  const [setName, setSetName] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<ProductType[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [state, formAction, isPending] = useActionState(suivreNouveauProduit, null);

  // La piste flex qui fait glisser les 3 étapes prend par défaut la hauteur de la plus
  // grande d'entre elles même quand une étape plus courte est affichée. On mesure donc
  // l'étape active pour caler la hauteur du viewport dessus. Callback ref plutôt que
  // useRef+useEffect : DialogContent (donc ce div) n'existe dans le DOM qu'une fois le
  // portail Radix monté, un ou deux rendus après l'ouverture. Un effet classique n'a
  // alors plus jamais l'occasion de re-mesurer. Le callback ref, lui, est rappelé par
  // React à chaque fois qu'il (ré)attache le noeud, donc toujours à jour.
  const [trackHeight, setTrackHeight] = useState<number | undefined>(undefined);

  function measureStep(el: HTMLDivElement | null, stepNumber: 1 | 2 | 3) {
    if (el && step === stepNumber) setTrackHeight(el.offsetHeight);
  }

  // referenceExtensions d'abord : TCGdex les liste du plus récent au plus ancien, et le
  // dédoublonnage par Set garde l'ordre de première apparition, donc ça prime sur l'ordre
  // (alphabétique) des produits déjà en base.
  const seriesExtensionOptions = useMemo(
    () => [...referenceExtensions, ...products],
    [products, referenceExtensions]
  );
  const seriesOptions = useMemo(() => distinctSeries(seriesExtensionOptions), [seriesExtensionOptions]);
  const setNameOptions = useMemo(
    () => setNamesForSeries(seriesExtensionOptions, series),
    [seriesExtensionOptions, series]
  );

  // Premier logo rencontré par série/extension : referenceExtensions passe en premier dans
  // seriesExtensionOptions, donc c'est lui qui gagne quand un même nom existe des deux côtés.
  const seriesLogos = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of referenceExtensions) {
      if (item.seriesLogoUrl && !map.has(item.series)) map.set(item.series, item.seriesLogoUrl);
    }
    return map;
  }, [referenceExtensions]);
  const setLogos = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of referenceExtensions) {
      if (item.setLogoUrl) map.set(logoKey(item.series, item.setName), item.setLogoUrl);
    }
    return map;
  }, [referenceExtensions]);
  const selectedSetLogoUrl = setLogos.get(logoKey(series, setName));

  function resetForm() {
    setStep(1);
    setSeries("");
    setSetName("");
    setSelectedTypes([]);
    setSelectedLanguages([]);
  }

  function toggleLanguage(language: string) {
    setSelectedLanguages((prev) =>
      prev.includes(language) ? prev.filter((l) => l !== language) : [...prev, language]
    );
  }

  function toggleAllLanguages() {
    setSelectedLanguages((prev) => (prev.length === languageOptions.length ? [] : [...languageOptions]));
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
    setStep(2);
  }

  function selectSetName(value: string) {
    setSetName(value);
    setSelectedTypes(ALL_TYPES);
    setStep(3);
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

        <form action={formAction} className="flex min-w-0 flex-col gap-4">
          <input type="hidden" name="series" value={series} />
          <input type="hidden" name="setName" value={setName} />
          <input type="hidden" name="imageUrl" value={selectedSetLogoUrl ?? ""} />
          {selectedTypes.map((t) => (
            <input key={t} type="hidden" name="type" value={t} />
          ))}
          {selectedLanguages.map((l) => (
            <input key={l} type="hidden" name="langue" value={l} />
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

          <div
            className="min-w-0 overflow-hidden transition-[height] duration-300 ease-in-out"
            style={{ height: trackHeight }}
          >
            <div
              className="flex min-w-0 items-start transition-transform duration-300 ease-in-out"
              style={{ transform: `translateX(-${(step - 1) * 100}%)` }}
            >
              <div
                ref={(el) => measureStep(el, 1)}
                className="flex w-full min-w-0 shrink-0 flex-col gap-2"
              >
                <span className="text-sm font-medium">Choisis une série</span>
                <div className="grid grid-cols-3 gap-2">
                  {seriesOptions.map((s) => (
                    <CoverTile
                      key={s}
                      label={s}
                      logoUrl={seriesLogos.get(s)}
                      onClick={() => selectSeries(s)}
                    />
                  ))}
                </div>
              </div>

              <div
                ref={(el) => measureStep(el, 2)}
                className="flex w-full min-w-0 shrink-0 flex-col gap-2"
              >
                <span className="text-sm font-medium">Choisis une extension : {series}</span>
                <div className="grid grid-cols-3 gap-2">
                  {setNameOptions.map((s) => (
                    <CoverTile
                      key={s}
                      label={s}
                      logoUrl={setLogos.get(logoKey(series, s))}
                      onClick={() => selectSetName(s)}
                    />
                  ))}
                </div>
              </div>

              <div
                ref={(el) => measureStep(el, 3)}
                className="flex w-full min-w-0 shrink-0 flex-col gap-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Choisis une ou plusieurs langues</span>
                  <label className="flex items-center gap-1.5 text-xs font-medium">
                    <input
                      type="checkbox"
                      checked={selectedLanguages.length === languageOptions.length}
                      onChange={toggleAllLanguages}
                      className="accent-primary size-3.5"
                    />
                    Tout sélectionner
                  </label>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {languageOptions.map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => toggleLanguage(l)}
                      className={cn(
                        "relative flex flex-col items-center justify-center gap-0.5 rounded-lg border px-2 py-3 text-xs font-medium ring-2 ring-inset ring-transparent transition",
                        selectedLanguages.includes(l)
                          ? "border-primary bg-primary/10 text-primary ring-primary"
                          : "border-input text-muted-foreground"
                      )}
                    >
                      <span className="text-sm font-semibold">{languageAbbreviations[l] ?? l}</span>
                      <span className="line-clamp-1">{l}</span>
                      {selectedLanguages.includes(l) && (
                        <span className="bg-primary text-primary-foreground absolute top-1.5 right-1.5 flex size-4 items-center justify-center rounded-full">
                          <Check className="size-2.5" />
                        </span>
                      )}
                    </button>
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
                    disabled={isPending || selectedLanguages.length === 0}
                    className="flex-1"
                  >
                    {isPending ? "Ajout..." : "Suivre"}
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
