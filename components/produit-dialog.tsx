"use client";

import {
  Camera,
  Check,
  Crop,
  Flag,
  ImageOff,
  Package,
  PartyPopper,
  Plus,
  SquarePen,
  ThumbsDown,
  ThumbsUp,
  TriangleAlert,
  X,
} from "lucide-react";
import {
  type ChangeEvent,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
  type SyntheticEvent,
  useActionState,
  useMemo,
  useRef,
  useState,
} from "react";

import { enregistrerProduit } from "@/app/(tabs)/magasins/actions";
import { Logo } from "@/components/logo";
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
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ConfidenceBadge } from "@/components/confidence-badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { makeConfetti, type ConfettiPiece } from "@/lib/confetti";
import { mockCurrentUser } from "@/lib/mock-data";
import {
  distinctSeries,
  languageAbbreviations,
  languageOptions,
  natureStyles,
  productTypeLabels,
  quantityOptions,
  setNamesForSeries,
  type SeriesExtensionPair,
} from "@/lib/product-options";
import type {
  Availability,
  AvailabilityNature,
  Product,
  ProductType,
  QuantityRange,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const natureOptions: AvailabilityNature[] = ["Nouveau", "Promo", "Réassort"];

function ProduitDialog({
  storeId,
  products,
  referenceExtensions = [],
  mode,
  availability,
  product,
  size = "default",
}: {
  storeId: string;
  products: Product[];
  /** Référentiel série/extension (TCGdex) : permet de choisir une extension qui vient
   *  de sortir et qu'aucun contributeur n'a encore signalée en magasin. */
  referenceExtensions?: SeriesExtensionPair[];
  mode: "create" | "edit";
  availability?: Availability;
  product?: Product;
  size?: "default" | "sm";
}) {
  const [open, setOpen] = useState(false);
  const [handledSuccess, setHandledSuccess] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [stepError, setStepError] = useState<string | null>(null);
  const [showGuidelines, setShowGuidelines] = useState(false);
  const [showPhotoGuidelines, setShowPhotoGuidelines] = useState(false);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(availability?.photoUrl ?? null);
  // Recadrage de la photo dans l'aperçu (étape 3) : la photo brute reste dans
  // photoDataUrl, croppedPhotoDataUrl ne porte que le résultat une fois validé (sinon
  // c'est la brute, telle quelle, qui sert d'aperçu et qui sera envoyée).
  const [isCropping, setIsCropping] = useState(false);
  const [cropZoom, setCropZoom] = useState(1);
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 });
  const [croppedPhotoDataUrl, setCroppedPhotoDataUrl] = useState<string | null>(null);
  const [cropNaturalSize, setCropNaturalSize] = useState<{ w: number; h: number } | null>(null);
  // Mesurée au clic sur "Recadrer" plutôt que lue depuis la ref pendant le rendu (interdit
  // par react-hooks/refs) : le conteneur est carré et ne change pas de taille en cours de
  // session de recadrage.
  const [cropContainerSize, setCropContainerSize] = useState<number | null>(null);
  const cropImgRef = useRef<HTMLImageElement>(null);
  const cropContainerRef = useRef<HTMLDivElement>(null);
  const cropDragStart = useRef<{ x: number; y: number; offsetX: number; offsetY: number } | null>(null);

  function resetCrop() {
    setIsCropping(false);
    setCropZoom(1);
    setCropOffset({ x: 0, y: 0 });
    setCroppedPhotoDataUrl(null);
    setCropNaturalSize(null);
    setCropContainerSize(null);
  }

  // Empêche l'image recadrée de laisser apparaître du vide dans le cadre carré, quels
  // que soient le zoom et le déplacement en cours.
  function clampCropOffset(offset: { x: number; y: number }, zoom: number) {
    const container = cropContainerRef.current;
    const natural = cropNaturalSize;
    if (!container || !natural) return offset;
    const size = container.clientWidth;
    const baseScale = Math.max(size / natural.w, size / natural.h);
    const scale = baseScale * zoom;
    const maxX = Math.max(0, (natural.w * scale - size) / 2);
    const maxY = Math.max(0, (natural.h * scale - size) / 2);
    return {
      x: Math.min(maxX, Math.max(-maxX, offset.x)),
      y: Math.min(maxY, Math.max(-maxY, offset.y)),
    };
  }

  function handleCropImageLoad(e: SyntheticEvent<HTMLImageElement>) {
    setCropNaturalSize({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight });
    setCropContainerSize((prev) => prev ?? cropContainerRef.current?.clientWidth ?? null);
  }

  function handleCropPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    cropDragStart.current = { x: e.clientX, y: e.clientY, offsetX: cropOffset.x, offsetY: cropOffset.y };
  }

  function handleCropPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!cropDragStart.current) return;
    const dx = e.clientX - cropDragStart.current.x;
    const dy = e.clientY - cropDragStart.current.y;
    setCropOffset(
      clampCropOffset(
        { x: cropDragStart.current.offsetX + dx, y: cropDragStart.current.offsetY + dy },
        cropZoom
      )
    );
  }

  function handleCropPointerUp() {
    cropDragStart.current = null;
  }

  function handleZoomChange(e: ChangeEvent<HTMLInputElement>) {
    const zoom = Number(e.target.value);
    setCropZoom(zoom);
    setCropOffset((prev) => clampCropOffset(prev, zoom));
  }

  /** Dessine dans un canvas exactement la portion de la photo brute actuellement visible
   *  dans le cadre (même géométrie que le rendu CSS pan/zoom), puis la fige en data URL. */
  function confirmCrop() {
    const img = cropImgRef.current;
    const container = cropContainerRef.current;
    const natural = cropNaturalSize;
    if (!img || !container || !natural) {
      setIsCropping(false);
      return;
    }
    const size = container.clientWidth;
    const baseScale = Math.max(size / natural.w, size / natural.h);
    const scale = baseScale * cropZoom;
    const renderedWidth = natural.w * scale;
    const renderedHeight = natural.h * scale;
    const srcX = (renderedWidth / 2 - size / 2 - cropOffset.x) / scale;
    const srcY = (renderedHeight / 2 - size / 2 - cropOffset.y) / scale;
    const srcSize = size / scale;

    const canvas = document.createElement("canvas");
    const outputSize = 720;
    canvas.width = outputSize;
    canvas.height = outputSize;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setIsCropping(false);
      return;
    }
    ctx.drawImage(img, srcX, srcY, srcSize, srcSize, 0, 0, outputSize, outputSize);
    setCroppedPhotoDataUrl(canvas.toDataURL("image/jpeg", 0.9));
    setIsCropping(false);
  }
  // referenceExtensions d'abord : TCGdex les liste du plus récent au plus ancien, et le
  // dédoublonnage par Set garde l'ordre de première apparition, donc ça prime sur l'ordre
  // (alphabétique) des produits déjà en base.
  const seriesExtensionOptions = useMemo(
    () => [...referenceExtensions, ...products],
    [products, referenceExtensions]
  );
  const seriesOptions = useMemo(() => distinctSeries(seriesExtensionOptions), [seriesExtensionOptions]);
  const [series, setSeries] = useState(product?.series ?? "");
  const setNameOptions = useMemo(
    () => setNamesForSeries(seriesExtensionOptions, series),
    [seriesExtensionOptions, series]
  );
  const [extension, setExtension] = useState(product?.setName ?? "");
  const [type, setType] = useState<ProductType | "">(product?.type ?? "");
  // Pas de recherche d'image automatique (pokemontcgapi.com) : testé sur plusieurs
  // extensions réelles, le catalogue mélange trop souvent des variantes promo/spéciales
  // (ex. "Espeon Mini Tin" affiché comme LE Pokébox, un blister promo ponctuel affiché
  // comme LE blister standard) avec le produit générique attendu. Une image fausse est
  // pire qu'aucune image : seule une vraie photo prise par l'utilisateur s'affiche ici.
  const typeOptions = Object.entries(productTypeLabels) as [ProductType, string][];
  // Types déjà signalés par la communauté pour cette série/extension précise (nos propres
  // données, pas un catalogue tiers) : sert juste à avertir, jamais à bloquer — toutes les
  // extensions n'ont pas les mêmes produits (pas de Duopack partout, par ex.), mais on ne
  // peut pas savoir à coup sûr qu'un type absent ici n'existe vraiment pas.
  const knownTypesForExtension = useMemo(() => {
    const types = new Set<ProductType>();
    for (const p of products) {
      if (p.series === series && p.setName === extension) types.add(p.type);
    }
    return types;
  }, [products, series, extension]);
  const isUnconfirmedType =
    !!type && !!extension && knownTypesForExtension.size > 0 && !knownTypesForExtension.has(type);
  const [language, setLanguage] = useState(availability?.language ?? "");
  const [nature, setNature] = useState<AvailabilityNature | "">(availability?.nature ?? "");
  const [price, setPrice] = useState(availability?.price != null ? String(availability.price) : "");
  const [quantity, setQuantity] = useState<QuantityRange | "">(availability?.quantity ?? "");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const action = enregistrerProduit.bind(null, storeId, availability?.id ?? null);
  const [state, formAction, isPending] = useActionState(action, null);

  if (state?.success && !handledSuccess) {
    setHandledSuccess(true);
    setConfetti(makeConfetti(28));
    setShowSuccess(true);
  }

  // stopPropagation seul (pas de preventDefault) : on doit empêcher le clic de remonter
  // au clic de la ligne parente (StoreCard/AvailabilityCard), mais le comportement par
  // défaut de Radix doit rester actif, sinon `onOpenChange` ne se déclenche jamais et
  // handleOpenChange (reset du step, de la photo, de l'avertissement...) ne tourne pas.
  function handleTriggerClick(e: MouseEvent) {
    e.stopPropagation();
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setHandledSuccess(false);
      setShowSuccess(false);
      setStep(1);
      setStepError(null);
      setShowGuidelines(true);
      setShowPhotoGuidelines(false);
      setPhotoDataUrl(availability?.photoUrl ?? null);
      resetCrop();
      const resetSeries = product?.series ?? "";
      setSeries(resetSeries);
      setExtension(product?.setName ?? "");
      setType(product?.type ?? "");
      setLanguage(availability?.language ?? "");
      setNature(availability?.nature ?? "");
      setPrice(availability?.price != null ? String(availability.price) : "");
      setQuantity(availability?.quantity ?? "");
    }
  }

  function goToStep2() {
    if (!photoDataUrl) {
      setStepError("Une photo est obligatoire.");
      return;
    }
    setStepError(null);
    setStep(2);
  }

  function goToStep3() {
    if (!type) return setStepError("Le type est obligatoire.");
    if (!language) return setStepError("La langue est obligatoire.");
    if (!series) return setStepError("La série est obligatoire.");
    if (!extension) return setStepError("L'extension est obligatoire.");
    if (!nature) return setStepError("La nature est obligatoire.");
    if (!quantity) return setStepError("La quantité est obligatoire.");
    if (quantity !== "Rupture" && !price) return setStepError("Le prix est obligatoire.");
    setStepError(null);
    setStep(3);
  }

  function goToEditPreview() {
    if (!nature) return setStepError("La nature est obligatoire.");
    if (!quantity) return setStepError("La quantité est obligatoire.");
    if (quantity !== "Rupture" && !price) return setStepError("Le prix est obligatoire.");
    setStepError(null);
    setStep(2);
  }

  // Appuyer sur Entrée dans un champ soumet le formulaire nativement (donc l'action serveur)
  // même sans bouton submit à l'écran : on l'intercepte pour rester sur l'étape en cours tant
  // qu'elle n'est pas validée, au lieu d'enregistrer le produit sans le reste des champs.
  function handleFormKeyDown(e: KeyboardEvent<HTMLFormElement>) {
    if (e.key !== "Enter") return;
    if (mode === "create") {
      if (step === 1) {
        e.preventDefault();
        goToStep2();
      } else if (step === 2) {
        e.preventDefault();
        goToStep3();
      }
    } else if (mode === "edit" && step === 1) {
      e.preventDefault();
      goToEditPreview();
    }
  }

  function handlePhotoClick(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    // L'avertissement ne sert qu'avant la toute première photo : pour reprendre une
    // photo déjà prise, on rouvre directement le sélecteur.
    if (photoDataUrl) {
      fileInputRef.current?.click();
    } else {
      setShowPhotoGuidelines(true);
    }
  }

  function handleConfirmPhotoGuidelines() {
    // .click() avant le setState : sur mobile, ouvrir la caméra (capture=environment)
    // est plus sensible qu'un simple sélecteur de fichiers et peut exiger d'être
    // l'action la plus directe possible du geste utilisateur.
    fileInputRef.current?.click();
    setShowPhotoGuidelines(false);
  }

  function handlePhotoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPhotoDataUrl(reader.result as string);
      resetCrop();
    };
    reader.readAsDataURL(file);
  }

  const formId = `${mode}-produit-${storeId}-${availability?.id ?? "new"}`;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button
          type="button"
          onClick={handleTriggerClick}
          aria-label={mode === "create" ? "Ajouter un produit" : "Modifier le produit"}
          className={`text-muted-foreground hover:bg-accent flex shrink-0 items-center justify-center rounded-md ${size === "sm" ? "size-6" : "size-8"}`}
        >
          {mode === "create" ? (
            <Plus className={size === "sm" ? "size-3" : "size-4"} />
          ) : (
            <SquarePen className={size === "sm" ? "size-3" : "size-4"} />
          )}
        </button>
      </DialogTrigger>
      <DialogContent
        onEscapeKeyDown={(e) => {
          if (!showGuidelines && !showPhotoGuidelines) return;
          e.preventDefault();
          setShowGuidelines(false);
          setShowPhotoGuidelines(false);
        }}
        // Toujours preventDefault ici, même sans warning affiché : ouvrir l'appareil
        // photo natif (input file) fait perdre le focus à la page le temps de la prise
        // de vue, ce que Radix traite comme une interaction "hors du dialogue" et ferme
        // tout par défaut — annulant la photo en cours. Le dialogue ne doit se fermer
        // que via Annuler/la croix/la soumission, jamais par une perte de focus externe.
        onPointerDownOutside={(e) => {
          e.preventDefault();
          if (!showGuidelines && !showPhotoGuidelines) return;
          setShowGuidelines(false);
          setShowPhotoGuidelines(false);
        }}
        onFocusOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => {
          e.preventDefault();
          if (!showGuidelines && !showPhotoGuidelines) return;
          setShowGuidelines(false);
          setShowPhotoGuidelines(false);
        }}
      >
        <div
          className={cn(
            "flex min-w-0 flex-col gap-4 transition-all duration-300",
            (showGuidelines || showPhotoGuidelines) && "pointer-events-none brightness-[0.4]"
          )}
        >
          <DialogHeader>
            <DialogTitle>{mode === "create" ? "Ajouter un produit" : "Modifier le produit"}</DialogTitle>
          </DialogHeader>

          <form
            action={formAction}
            onKeyDown={handleFormKeyDown}
            className="flex flex-col gap-4"
          >
          {mode === "create" && (
            <input type="hidden" name="photoUrl" value={croppedPhotoDataUrl ?? photoDataUrl ?? ""} />
          )}
          {mode === "create" && (
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoChange}
              className="hidden"
            />
          )}

          {mode === "create" && (
            <div className="flex gap-1.5">
              <div className={`h-1.5 flex-1 rounded-full ${step >= 1 ? "bg-primary" : "bg-muted"}`} />
              <div className={`h-1.5 flex-1 rounded-full ${step >= 2 ? "bg-primary" : "bg-muted"}`} />
              <div className={`h-1.5 flex-1 rounded-full ${step >= 3 ? "bg-primary" : "bg-muted"}`} />
            </div>
          )}

          {mode === "edit" && (
            <div className="flex gap-1.5">
              <div className={`h-1.5 flex-1 rounded-full ${step >= 1 ? "bg-primary" : "bg-muted"}`} />
              <div className={`h-1.5 flex-1 rounded-full ${step >= 2 ? "bg-primary" : "bg-muted"}`} />
            </div>
          )}

          <div className="overflow-hidden">
            <div
              className="flex transition-transform duration-300 ease-in-out"
              style={{ transform: `translateX(-${(step - 1) * 100}%)` }}
            >
          {mode === "create" && (
            <div className="flex w-full shrink-0 flex-col gap-4">
              <button
                type="button"
                onClick={handlePhotoClick}
                aria-label={photoDataUrl ? "Reprendre la photo" : "Prendre une photo"}
                className="border-input bg-muted hover:bg-accent relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-md border border-dashed"
              >
                {photoDataUrl ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element -- data URL locale, pas d'optimisation next/image possible */}
                    <img
                      src={photoDataUrl}
                      alt="Photo du produit"
                      className="h-full w-full object-cover"
                    />
                    <span className="bg-background/80 text-foreground absolute bottom-2 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium backdrop-blur-sm">
                      <Camera className="size-3.5" />
                      Reprendre la photo
                    </span>
                  </>
                ) : (
                  <span className="text-muted-foreground flex flex-col items-center gap-1 text-xs">
                    <Camera className="size-5" />
                    Prendre une photo
                  </span>
                )}
              </button>
            </div>
          )}

          <div className="flex w-full shrink-0 flex-col gap-4">
            {mode === "create" && (
              <>
              <div className="flex gap-3">
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <label htmlFor={`series-${formId}`} className="text-sm font-medium">
                    Série
                  </label>
                  <Select
                    value={series}
                    onValueChange={(value) => {
                      setSeries(value);
                      setExtension("");
                      setType("");
                    }}
                    name="series"
                    required
                    disabled={seriesOptions.length === 0}
                  >
                    <SelectTrigger id={`series-${formId}`}>
                      <SelectValue
                        placeholder={
                          seriesOptions.length === 0 ? "Aucune série disponible" : "Choisir une série"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {seriesOptions.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <label htmlFor={`setName-${formId}`} className="text-sm font-medium">
                    Extension
                  </label>
                  <Select
                    value={extension}
                    onValueChange={(value) => {
                      setExtension(value);
                      // Les types valides dépendent de l'extension : une sélection faite
                      // pour la précédente n'a plus de raison d'être valide pour la nouvelle.
                      setType("");
                    }}
                    name="setName"
                    required
                    disabled={setNameOptions.length === 0}
                  >
                    <SelectTrigger id={`setName-${formId}`}>
                      <SelectValue
                        placeholder={
                          setNameOptions.length === 0 ? "Choisis d'abord une série" : "Choisir une extension"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {setNameOptions.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <label htmlFor={`type-${formId}`} className="text-sm font-medium">
                    Type
                  </label>
                  <Select
                    value={type}
                    onValueChange={(value) => setType(value as ProductType)}
                    name="type"
                    disabled={!extension}
                  >
                    <SelectTrigger id={`type-${formId}`}>
                      <SelectValue
                        placeholder={!extension ? "Choisis d'abord une extension" : "Choisir un type"}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {typeOptions.map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {isUnconfirmedType && (
                    <p className="text-amber-500 text-xs">
                      Jamais signalé pour cette extension, vérifie avant de valider.
                    </p>
                  )}
                </div>

                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <label htmlFor={`language-${formId}`} className="text-sm font-medium">
                    Langue
                  </label>
                  <Select value={language} onValueChange={setLanguage} name="language" required>
                    <SelectTrigger id={`language-${formId}`}>
                      <SelectValue placeholder="Choisir une langue" />
                    </SelectTrigger>
                    <SelectContent>
                      {languageOptions.map((l) => (
                        <SelectItem key={l} value={l}>
                          {l}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              </>
            )}

            <div className="flex flex-col gap-1.5">
            <label htmlFor={`nature-${formId}`} className="text-sm font-medium">
              Nature
            </label>
            <Select
              value={nature}
              onValueChange={(value) => setNature(value as AvailabilityNature)}
              name="nature"
              required
            >
              <SelectTrigger id={`nature-${formId}`}>
                <SelectValue placeholder="Choisir une nature" />
              </SelectTrigger>
              <SelectContent>
                {natureOptions.map((n) => (
                  <SelectItem key={n} value={n}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3">
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <label htmlFor={`price-${formId}`} className="text-sm font-medium">
                Prix
              </label>
              <Input
                id={`price-${formId}`}
                name="price"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={price}
                onChange={(e) => {
                  const value = e.target.value;
                  if (/^\d*([.,]\d{0,2})?$/.test(value)) {
                    setPrice(value);
                  }
                }}
                required={quantity !== "Rupture"}
                disabled={quantity === "Rupture"}
                placeholder={quantity === "Rupture" ? "Pas de prix en rupture" : "4.50"}
              />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <label htmlFor={`quantity-${formId}`} className="text-sm font-medium">
                Quantité
              </label>
              <Select
                value={quantity}
                onValueChange={(value) => {
                  const q = value as QuantityRange;
                  setQuantity(q);
                  if (q === "Rupture") setPrice("");
                }}
                name="quantity"
                required
              >
                <SelectTrigger id={`quantity-${formId}`}>
                  <SelectValue placeholder="Choisir une quantité" />
                </SelectTrigger>
                <SelectContent>
                  {quantityOptions.map((q) => (
                    <SelectItem key={q} value={q}>
                      {q}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          </div>

          {(() => {
            return (
              <div className="flex w-full shrink-0 flex-col gap-3">
                <p className="text-sm font-medium">Aperçu</p>
              {/* Classes copiées à l'identique d'AvailabilityCard (photo + bloc infos) pour que
                  l'aperçu ait les mêmes proportions que la vraie card. Largeur réduite à la
                  moitié du dialogue pour reproduire sa taille réelle dans la grille à 2 colonnes,
                  au lieu d'étirer la photo sur toute la largeur du dialogue. */}
              <div className="relative mx-auto w-1/2 min-w-[140px]">
              <Card className={cn("h-full gap-1.5 p-2", showSuccess && "animate-card-launch")}>
                <div
                  ref={cropContainerRef}
                  className="bg-muted text-muted-foreground relative -mx-2 -mt-2 flex aspect-square shrink-0 items-center justify-center overflow-hidden rounded-t-xl"
                >
                  {isCropping && photoDataUrl ? (
                    <div
                      className="absolute inset-0 touch-none"
                      onPointerDown={handleCropPointerDown}
                      onPointerMove={handleCropPointerMove}
                      onPointerUp={handleCropPointerUp}
                      onPointerCancel={handleCropPointerUp}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- data URL locale, transformation dynamique incompatible avec next/image */}
                      <img
                        ref={cropImgRef}
                        src={photoDataUrl}
                        alt="Recadrage de la photo"
                        draggable={false}
                        onLoad={handleCropImageLoad}
                        className="pointer-events-none absolute top-1/2 left-1/2 max-w-none select-none"
                        style={
                          cropNaturalSize && cropContainerSize
                            ? (() => {
                                const baseScale = Math.max(
                                  cropContainerSize / cropNaturalSize.w,
                                  cropContainerSize / cropNaturalSize.h
                                );
                                const scale = baseScale * cropZoom;
                                return {
                                  width: cropNaturalSize.w * scale,
                                  height: cropNaturalSize.h * scale,
                                  transform: `translate(-50%, -50%) translate(${cropOffset.x}px, ${cropOffset.y}px)`,
                                };
                              })()
                            : { width: "100%", height: "100%", objectFit: "cover" as const }
                        }
                      />
                    </div>
                  ) : photoDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- data URL locale, pas d'optimisation next/image possible
                    <img
                      src={croppedPhotoDataUrl ?? photoDataUrl}
                      alt="Aperçu du produit"
                      className={cn(
                        "h-full w-full object-cover",
                        quantity === "Rupture" && "grayscale"
                      )}
                    />
                  ) : (
                    <ImageOff className="size-10" aria-label="Pas encore de photo" />
                  )}
                  {!isCropping && (
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent" />
                  )}
                  {!isCropping && nature && (
                    <div className="absolute top-1.5 right-1.5 flex items-center gap-1">
                      <Badge className={cn("border-transparent", natureStyles[nature])}>{nature}</Badge>
                    </div>
                  )}
                  {!isCropping && photoDataUrl && (
                    <div className="absolute top-1/2 right-1.5 flex -translate-y-1/2 flex-col gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setCropContainerSize(cropContainerRef.current?.clientWidth ?? null);
                          setIsCropping(true);
                        }}
                        aria-label="Recadrer la photo"
                        className="bg-background/80 text-foreground hover:bg-background flex size-7 items-center justify-center rounded-full backdrop-blur-sm"
                      >
                        <Crop className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={handlePhotoClick}
                        aria-label="Reprendre une photo"
                        className="bg-background/80 text-foreground hover:bg-background flex size-7 items-center justify-center rounded-full backdrop-blur-sm"
                      >
                        <Camera className="size-3.5" />
                      </button>
                    </div>
                  )}
                </div>
                {isCropping && (
                  <div className="flex flex-col gap-1.5 pt-2">
                    <input
                      type="range"
                      min={1}
                      max={3}
                      step={0.01}
                      value={cropZoom}
                      onChange={handleZoomChange}
                      aria-label="Zoom"
                      className="w-full"
                    />
                    <div className="flex gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="flex-1 gap-1"
                        onClick={() => {
                          setIsCropping(false);
                          setCropZoom(1);
                          setCropOffset({ x: 0, y: 0 });
                        }}
                      >
                        <X className="size-3.5" />
                        Annuler
                      </Button>
                      <Button type="button" size="sm" className="flex-1 gap-1" onClick={confirmCrop}>
                        <Check className="size-3.5" />
                        Valider
                      </Button>
                    </div>
                  </div>
                )}
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <div className="flex min-h-10 items-start justify-between gap-2">
                    <h3 className="line-clamp-2 min-w-0 flex-1 text-sm font-semibold">
                      {type ? productTypeLabels[type] : "…"} {extension || "…"}
                    </h3>
                    <div className="flex shrink-0 flex-col items-end gap-0.5">
                      {price && quantity !== "Rupture" && (
                        <span className="text-sm font-semibold">{price} €</span>
                      )}
                      {quantity && (
                        <Badge variant="secondary" className="gap-1">
                          <Package className="size-3" />
                          {quantity}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex min-h-5 flex-wrap items-center gap-1.5">
                    <span className="text-muted-foreground text-xs">{series || "…"}</span>
                    {language && (
                      <Badge variant="outline" className="shrink-0">
                        {languageAbbreviations[language] ?? language}
                      </Badge>
                    )}
                  </div>
                  <div className="flex min-h-5 flex-wrap items-center gap-1">
                    <span className="text-muted-foreground/70 truncate text-xs">
                      {mode === "create" ? "Créé par" : "Modifié par"} {mockCurrentUser.username} ·{" "}
                      à l&apos;instant
                    </span>
                  </div>
                  <div className="mt-auto flex flex-nowrap items-center gap-0 pt-0.5">
                    <div className="flex items-center">
                      <button
                        type="button"
                        disabled
                        aria-label="Confirmer cette disponibilité"
                        className="text-muted-foreground flex size-6 shrink-0 items-center justify-center rounded-md disabled:opacity-50"
                      >
                        <ThumbsUp className="size-3" />
                      </button>
                      <span className="text-muted-foreground text-[11px] tabular-nums">0</span>
                    </div>
                    <div className="flex items-center">
                      <button
                        type="button"
                        disabled
                        aria-label="Contester cette disponibilité"
                        className="text-muted-foreground flex size-6 shrink-0 items-center justify-center rounded-md disabled:opacity-50"
                      >
                        <ThumbsDown className="size-3" />
                      </button>
                      <span className="text-muted-foreground text-[11px] tabular-nums">0</span>
                    </div>
                    <ConfidenceBadge
                      confidence={mockCurrentUser.reputation}
                      className="ml-2 h-4 px-0.5 py-0 text-[10px] leading-none"
                    />
                    <button
                      type="button"
                      disabled
                      aria-label="Signaler cette disponibilité"
                      className="text-muted-foreground ml-auto flex size-6 shrink-0 items-center justify-center rounded-md disabled:opacity-50"
                    >
                      <Flag className="size-3" />
                    </button>
                    <button
                      type="button"
                      disabled
                      aria-label="Modifier le produit"
                      className="text-muted-foreground flex size-6 shrink-0 items-center justify-center rounded-md disabled:opacity-50"
                    >
                      <SquarePen className="size-3" />
                    </button>
                  </div>
                </div>
              </Card>
              {showSuccess && (
                <div className="pointer-events-none absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl">
                  {confetti.map((piece, i) => (
                    <span
                      key={i}
                      aria-hidden
                      className="confetti-piece absolute top-0 size-2 rounded-sm"
                      style={
                        {
                          left: `${piece.left}%`,
                          backgroundColor: piece.color,
                          animationDuration: `${piece.duration}s`,
                          animationDelay: `${piece.delay}s`,
                          "--confetti-drift": `${piece.drift}px`,
                          "--confetti-rotation": `${piece.rotation}deg`,
                        } as CSSProperties
                      }
                    />
                  ))}
                  <div className="animate-success-pop bg-primary text-primary-foreground flex items-center gap-2 rounded-full px-4 py-2 shadow-lg">
                    <PartyPopper className="size-4" />
                    <span className="text-sm font-semibold">Publié !</span>
                  </div>
                  <p className="animate-success-pop text-muted-foreground bg-card rounded-full px-3 py-1 text-xs shadow-sm">
                    {mode === "create"
                      ? "Ton produit a été ajouté avec succès."
                      : "Tes modifications ont été enregistrées."}
                  </p>
                </div>
              )}
              </div>
                {!showSuccess && (
                  <p className="text-muted-foreground text-xs">
                    {mode === "create"
                      ? "Vérifie que tout est correct avant d'ajouter le produit."
                      : "Vérifie que tout est correct avant d'enregistrer les modifications."}
                  </p>
                )}
              </div>
            );
          })()}
            </div>
          </div>

          {stepError && <p className="text-destructive text-sm">{stepError}</p>}
          {state?.error && <p className="text-destructive text-sm">{state.error}</p>}

          <DialogFooter className={showSuccess ? "hidden" : undefined}>
            {mode === "create" && step === 1 ? (
              <div key="step-1" className="flex gap-2">
                <DialogClose asChild>
                  <Button type="button" variant="outline" className="flex-1">
                    Annuler
                  </Button>
                </DialogClose>
                <Button type="button" className="flex-1" onClick={goToStep2}>
                  Suivant
                </Button>
              </div>
            ) : mode === "create" && step === 2 ? (
              <div key="step-2" className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(1)}>
                  Retour
                </Button>
                <Button type="button" className="flex-1" onClick={goToStep3}>
                  Suivant
                </Button>
              </div>
            ) : mode === "create" ? (
              <div key="step-3" className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(2)}>
                  Retour
                </Button>
                <Button type="submit" disabled={isPending} className="flex-1">
                  {isPending ? "Envoi..." : "Ajouter"}
                </Button>
              </div>
            ) : mode === "edit" && step === 1 ? (
              <div key="edit-step-1" className="flex gap-2">
                <DialogClose asChild>
                  <Button type="button" variant="outline" className="flex-1">
                    Annuler
                  </Button>
                </DialogClose>
                <Button type="button" className="flex-1" onClick={goToEditPreview}>
                  Suivant
                </Button>
              </div>
            ) : (
              <div key="edit-step-2" className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(1)}>
                  Retour
                </Button>
                <Button type="submit" disabled={isPending} className="flex-1">
                  {isPending ? "Envoi..." : "Enregistrer"}
                </Button>
              </div>
            )}
          </DialogFooter>
          </form>
        </div>

        {showGuidelines && (
          <div
            className="absolute inset-0 z-20 flex items-center justify-center p-4"
            onClick={() => setShowGuidelines(false)}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowGuidelines(false);
              }}
              // Un vrai <button> plutôt qu'un <div role="button"> : sur iOS Safari, un
              // élément non nativement interactif peut exiger un premier tap "à vide"
              // (simulation du survol) avant qu'un second tap ne déclenche réellement le
              // clic — d'où le besoin de confirmer deux fois avant que la prise de photo
              // ne s'enchaîne juste après.
              className="animate-alert-in border-amber-500/50 bg-card text-muted-foreground relative flex w-full cursor-pointer flex-col gap-2 overflow-hidden rounded-md border p-4 pt-5 pb-5 text-left text-xs shadow-2xl"
            >
              <div
                aria-hidden
                className="animate-hazard-stripes absolute inset-x-0 top-0 h-1.5"
                style={{
                  backgroundImage: "repeating-linear-gradient(45deg, #f5b400 0 7px, #1a1a1a 7px 14px)",
                  backgroundSize: "28px 100%",
                }}
              />
              <div
                aria-hidden
                className="animate-hazard-stripes absolute inset-x-0 bottom-0 h-1.5"
                style={{
                  backgroundImage: "repeating-linear-gradient(45deg, #f5b400 0 7px, #1a1a1a 7px 14px)",
                  backgroundSize: "28px 100%",
                }}
              />

              <div className="mb-1 flex flex-col items-center gap-1">
                <Logo className="size-9" />
                <p className="text-sm font-bold">
                  Poket<span className="text-[#f2a93c]">Secret</span>
                </p>
              </div>
              <p className="flex items-center gap-1.5 text-sm font-semibold text-amber-400">
                <TriangleAlert className="size-4" />
                {mode === "create" ? "Avant d'ajouter ce produit" : "Avant de modifier ce produit"}
              </p>
              <ul className="list-disc space-y-0.5 pl-4">
                {mode === "create" ? (
                  <>
                    <li>Produit réellement disponible dans ce magasin</li>
                    <li>Prix et quantité vérifiés</li>
                    <li>Déjà référencé ? Confirme l&apos;annonce existante plutôt que d&apos;en créer une nouvelle</li>
                    <li>Orthographe et majuscules soignées, pour le bien de tous</li>
                  </>
                ) : (
                  <>
                    <li>Modifications conformes à la disponibilité réelle</li>
                    <li>Prix et quantité vérifiés</li>
                    <li>Orthographe et majuscules soignées, pour le bien de tous</li>
                  </>
                )}
              </ul>
              {mode === "create" && (
                <p className="text-muted-foreground">
                  Une erreur ? Tu pourras toujours revenir la corriger.
                </p>
              )}
              <p className="text-amber-400/90">
                Les signalements répétés font baisser ta fiabilité et peuvent restreindre ton compte.
              </p>
              <p className="text-muted-foreground">
                À l&apos;inverse, des contributions de qualité font monter ta réputation et
                débloquent plus de droits (votes, signalements, magasins par semaine).
              </p>
              <p className="text-muted-foreground animate-gentle-blink mt-1 text-center text-[11px]">
                Touche pour confirmer, en dehors pour annuler
              </p>
            </button>
          </div>
        )}

        {showPhotoGuidelines && (
          <div
            className="absolute inset-0 z-20 flex items-center justify-center p-4"
            onClick={() => setShowPhotoGuidelines(false)}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleConfirmPhotoGuidelines();
              }}
              className="animate-alert-in border-amber-500/50 bg-card text-muted-foreground relative flex w-full cursor-pointer flex-col gap-2 overflow-hidden rounded-md border p-4 pt-5 pb-5 text-left text-xs shadow-2xl"
            >
              <div
                aria-hidden
                className="animate-hazard-stripes absolute inset-x-0 top-0 h-1.5"
                style={{
                  backgroundImage: "repeating-linear-gradient(45deg, #f5b400 0 7px, #1a1a1a 7px 14px)",
                  backgroundSize: "28px 100%",
                }}
              />
              <div
                aria-hidden
                className="animate-hazard-stripes absolute inset-x-0 bottom-0 h-1.5"
                style={{
                  backgroundImage: "repeating-linear-gradient(45deg, #f5b400 0 7px, #1a1a1a 7px 14px)",
                  backgroundSize: "28px 100%",
                }}
              />

              <div className="mb-1 flex flex-col items-center gap-1">
                <Logo className="size-9" />
                <p className="text-sm font-bold">
                  Poket<span className="text-[#f2a93c]">Secret</span>
                </p>
              </div>
              <p className="flex items-center gap-1.5 text-sm font-semibold text-amber-400">
                <TriangleAlert className="size-4" />
                Avant de prendre la photo
              </p>
              <ul className="list-disc space-y-0.5 pl-4">
                <li>Prise par toi, à l&apos;instant, dans ce magasin (pas une image trouvée en ligne)</li>
                <li>Photo nette et bien éclairée</li>
                <li>Produit clairement identifiable</li>
                <li>Aucun contenu inapproprié ou hors sujet</li>
              </ul>
              <p className="text-amber-400/90">
                Les signalements répétés font baisser ta fiabilité et peuvent restreindre ton compte.
              </p>
              <p className="text-muted-foreground">
                À l&apos;inverse, des contributions de qualité font monter ta réputation et
                débloquent plus de droits (votes, signalements, magasins par semaine).
              </p>
              <p className="text-muted-foreground animate-gentle-blink mt-1 text-center text-[11px]">
                Touche pour confirmer, en dehors pour annuler
              </p>
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function AjouterProduitDialog({
  storeId,
  products,
  referenceExtensions,
}: {
  storeId: string;
  products: Product[];
  referenceExtensions?: SeriesExtensionPair[];
}) {
  return (
    <ProduitDialog
      storeId={storeId}
      products={products}
      referenceExtensions={referenceExtensions}
      mode="create"
    />
  );
}

export function ModifierProduitDialog({
  storeId,
  products,
  availability,
  product,
  size,
}: {
  storeId: string;
  products: Product[];
  availability: Availability;
  product: Product;
  size?: "default" | "sm";
}) {
  return (
    <ProduitDialog
      storeId={storeId}
      products={products}
      mode="edit"
      availability={availability}
      product={product}
      size={size}
    />
  );
}
