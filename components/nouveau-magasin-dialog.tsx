"use client";

import {
  Check,
  Flag,
  MapPin,
  PartyPopper,
  Phone,
  Plus,
  Search,
  SquarePen,
  ThumbsDown,
  ThumbsUp,
  TriangleAlert,
} from "lucide-react";
import {
  type ChangeEvent,
  type CSSProperties,
  type KeyboardEvent,
  useActionState,
  useEffect,
  useRef,
  useState,
} from "react";

import { AsYouType } from "libphonenumber-js";

import { creerMagasin, modifierMagasin } from "@/app/(tabs)/magasins/nouveau/actions";
import { ConfidenceBadge } from "@/components/confidence-badge";
import { Logo } from "@/components/logo";
import { StoreLocationPicker } from "@/components/store-location-picker";
import { TierBadge } from "@/components/tier-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { storeConfidence } from "@/lib/confidence";
import { type ConfettiPiece, makeConfetti } from "@/lib/confetti";
import { dayLabels, formatDayHours, parseHoursFromFormData, weekdayOrder } from "@/lib/hours";
import type { AuthorInfo } from "@/lib/queries";
import type { Store, StoreHours, Weekday } from "@/lib/types";
import { cn } from "@/lib/utils";

// Score de confiance minimum (API Adresse, 0-1) en dessous duquel le meilleur résultat
// est traité comme "pas de vraie correspondance" — voir l'effet de recherche plus bas.
const ADDRESS_MATCH_MIN_SCORE = 0.6;

const days: { key: Weekday; label: string }[] = [
  { key: "lundi", label: "Lundi" },
  { key: "mardi", label: "Mardi" },
  { key: "mercredi", label: "Mercredi" },
  { key: "jeudi", label: "Jeudi" },
  { key: "vendredi", label: "Vendredi" },
  { key: "samedi", label: "Samedi" },
  { key: "dimanche", label: "Dimanche" },
];

interface AddressSuggestion {
  label: string;
  city: string;
  postalCode: string;
  lat: number;
  lng: number;
}

function initialClosedDays(store?: Store): Partial<Record<Weekday, boolean>> {
  const result: Partial<Record<Weekday, boolean>> = {};
  if (!store?.hours) return result;
  for (const day of days) {
    if (store.hours[day.key]?.closed) result[day.key] = true;
  }
  return result;
}

function initialClosedPeriods(
  store?: Store
): Partial<Record<Weekday, { morning?: boolean; afternoon?: boolean }>> {
  const result: Partial<Record<Weekday, { morning?: boolean; afternoon?: boolean }>> = {};
  if (!store?.hours) return result;
  for (const day of days) {
    const dayHours = store.hours[day.key];
    if (!dayHours || dayHours.closed) continue;
    const morning = !dayHours.morningOpen && !dayHours.morningClose;
    const afternoon = !dayHours.afternoonOpen && !dayHours.afternoonClose;
    if (morning || afternoon) result[day.key] = { morning, afternoon };
  }
  return result;
}

function PeriodFields({
  dayKey,
  period,
  label,
  closed,
  defaultOpen,
  defaultClose,
  onToggleClosed,
}: {
  dayKey: Weekday;
  period: "morning" | "afternoon";
  label: string;
  closed: boolean;
  defaultOpen?: string;
  defaultClose?: string;
  onToggleClosed: (checked: boolean) => void;
}) {
  // Empêche de saisir une heure d'après-midi dans le créneau du matin et inversement
  // (ex. 15:00 pour "Matin"), via les bornes natives de l'input time.
  const bounds =
    period === "morning"
      ? { min: "00:00", max: "12:00", title: "Une heure du matin (avant midi)" }
      : { min: "12:00", max: "23:59", title: "Une heure de l'après-midi/soir (après midi)" };

  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground w-16 shrink-0 text-xs">{label}</span>

      {closed ? (
        <span className="text-muted-foreground flex-1 text-xs italic">Fermé</span>
      ) : (
        <div className="flex flex-1 items-center gap-1.5">
          <Input
            type="time"
            name={`hours_${dayKey}_${period}Open`}
            defaultValue={defaultOpen}
            min={bounds.min}
            max={bounds.max}
            title={bounds.title}
            className="h-8 w-fit text-xs"
          />
          <span className="text-muted-foreground text-xs">–</span>
          <Input
            type="time"
            name={`hours_${dayKey}_${period}Close`}
            defaultValue={defaultClose}
            min={bounds.min}
            max={bounds.max}
            title={bounds.title}
            className="h-8 w-fit text-xs"
          />
        </div>
      )}

      <label className="flex shrink-0 items-center gap-1.5">
        <Checkbox checked={closed} onCheckedChange={(checked) => onToggleClosed(checked === true)} />
        <span className="text-muted-foreground text-xs">Fermé</span>
      </label>
    </div>
  );
}

function MagasinDialog({
  mode,
  store,
  currentUser,
}: {
  mode: "create" | "edit";
  store?: Store;
  currentUser?: AuthorInfo;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const action = mode === "edit" && store ? modifierMagasin.bind(null, store.id) : creerMagasin;
  const [state, formAction, isPending] = useActionState(action, null);
  const [handledSuccess, setHandledSuccess] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);
  const [showGuidelines, setShowGuidelines] = useState(false);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [stepError, setStepError] = useState<string | null>(null);
  const [name, setName] = useState(store?.name ?? "");
  const [addressQuery, setAddressQuery] = useState(store?.address ?? "");
  const [city, setCity] = useState(store?.city ?? "");
  const [postalCode, setPostalCode] = useState(store?.postalCode ?? "");
  const [phone, setPhone] = useState(store?.phone ?? "");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    store && (store.lat !== 0 || store.lng !== 0) ? { lat: store.lat, lng: store.lng } : null
  );
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  // Vrai une fois qu'une recherche (>= 3 caractères) est allée jusqu'au bout sans renvoyer
  // le moindre résultat (adresse sans numéro, rue trop récente pour la Base Adresse
  // Nationale...) : distinct de "pas encore cherché", pour ne montrer l'avertissement
  // "utilise la carte" qu'une fois la recherche réellement infructueuse.
  const [searchedNoResults, setSearchedNoResults] = useState(false);
  // Onglet actif pour localiser le magasin : les deux options sont visibles d'emblée,
  // côte à côte, pas un bouton "carte" caché sous le champ adresse (moins découvrable).
  // Le champ adresse et la carte restent tous les deux montés en permanence, seul leur
  // affichage bascule (`hidden`) : l'onglet inactif ne doit jamais faire disparaître la
  // valeur de `name="address"` du FormData au moment de la soumission.
  const [locationMethod, setLocationMethod] = useState<"adresse" | "carte">("adresse");
  // "manual" dès que l'utilisateur tape lui-même dans le champ ou choisit une suggestion :
  // un clic ultérieur sur la carte (pour ajuster le pin) ne doit alors plus écraser ce
  // texte. Reste "map" (ou null) tant que adresse/ville ne viennent que d'un géocodage
  // inversé automatique : dans ce cas, chaque nouveau clic doit au contraire pouvoir les
  // remettre à jour, sinon déplacer le pin laisse une adresse périmée par rapport au point
  // réellement sélectionné (l'ajustement n'aurait alors d'effet qu'au tout premier clic).
  // N'affecte jamais le rendu (jamais lu en JSX), juste utilisé pour arbitrer une
  // écriture asynchrone plus bas : une ref suffit, pas besoin de re-render dessus.
  const addressSourceRef = useRef<"manual" | "map" | null>(
    store && (store.lat !== 0 || store.lng !== 0) ? "manual" : null
  );
  const [closedDays, setClosedDays] = useState<Partial<Record<Weekday, boolean>>>(() =>
    initialClosedDays(store)
  );
  const [closedPeriods, setClosedPeriods] = useState<
    Partial<Record<Weekday, { morning?: boolean; afternoon?: boolean }>>
  >(() => initialClosedPeriods(store));
  // Capturé au passage vers l'étape 3 (aperçu) : les horaires vivent dans des champs non
  // contrôlés, donc on relit le FormData à ce moment-là plutôt que de dupliquer leur état
  // dans une dizaine de useState supplémentaires (le téléphone, lui, est déjà dans `phone`).
  const [previewPhone, setPreviewPhone] = useState(store?.phone ?? "");
  const [previewHours, setPreviewHours] = useState<StoreHours | undefined>(store?.hours);

  // La piste flex qui fait glisser les 3 étapes prend par défaut la hauteur de la plus
  // grande d'entre elles (horaires, avec ses 7 cartes) même quand une étape plus courte
  // est affichée. On mesure donc l'étape active pour caler la hauteur du viewport dessus.
  // Callback ref plutôt que useRef+useEffect : DialogContent (donc ce div) n'existe dans
  // le DOM qu'une fois le portail Radix monté, un ou deux rendus après l'ouverture. Un
  // effet classique n'a alors plus jamais l'occasion de re-mesurer. Le callback ref, lui,
  // est rappelé par React à chaque fois qu'il (ré)attache le noeud, donc toujours à jour.
  const [trackHeight, setTrackHeight] = useState<number | undefined>(undefined);
  // Conservé à part de measureStep (qui ne (re)déclenche que sur montage/démontage du
  // noeud, pas sur un simple changement de son contenu) : afficher/masquer la carte ou
  // l'avertissement fait grandir/rétrécir l'étape 1 sans que son noeud ne change, donc
  // sans ça trackHeight resterait périmé et couperait la carte.
  const step1ElRef = useRef<HTMLDivElement | null>(null);

  function measureStep(el: HTMLDivElement | null, stepNumber: 1 | 2 | 3) {
    if (stepNumber === 1) step1ElRef.current = el;
    if (el && step === stepNumber) setTrackHeight(el.offsetHeight);
  }

  useEffect(() => {
    if (step === 1 && step1ElRef.current) setTrackHeight(step1ElRef.current.offsetHeight);
  }, [step, locationMethod, searchedNoResults]);

  // ResizeObserver plutôt qu'une dépendance de plus dans l'effet ci-dessus : la carte
  // (StoreLocationPicker) et le texte "Adresse détectée" apparaissent après un clic sur
  // la carte suivi d'un géocodage inversé ASYNCHRONE (coords, puis un peu plus tard
  // adresse/ville une fois la requête résolue) — la carte se retrouvait coupée par la
  // hauteur figée (overflow-hidden) car aucune des dépendances ci-dessus ne changeait à
  // ce moment-là. Un ResizeObserver capture tout changement de hauteur réel du contenu,
  // quelle qu'en soit la cause, sans avoir à réénumérer chaque état qui peut y contribuer.
  useEffect(() => {
    const el = step1ElRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      if (step === 1) setTrackHeight(entries[0].contentRect.height);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [step]);

  function resetForm() {
    setStep(1);
    setStepError(null);
    setShowSuccess(false);
    setShowGuidelines(false);
    setName(store?.name ?? "");
    setAddressQuery(store?.address ?? "");
    setCity(store?.city ?? "");
    setPostalCode(store?.postalCode ?? "");
    setPhone(store?.phone ?? "");
    setCoords(store && (store.lat !== 0 || store.lng !== 0) ? { lat: store.lat, lng: store.lng } : null);
    setSuggestions([]);
    setShowSuggestions(false);
    setSearchedNoResults(false);
    setLocationMethod("adresse");
    addressSourceRef.current = store && (store.lat !== 0 || store.lng !== 0) ? "manual" : null;
    setClosedDays(initialClosedDays(store));
    setClosedPeriods(initialClosedPeriods(store));
    setPreviewPhone(store?.phone ?? "");
    setPreviewHours(store?.hours);
  }

  function goToStep2() {
    // On relit les valeurs directement dans le DOM (via FormData) plutôt que le seul state
    // React : un remplissage par l'autofill du navigateur ne déclenche pas toujours onChange.
    const data = formRef.current ? new FormData(formRef.current) : null;
    const nameVal = ((data?.get("name") as string) ?? name).trim();
    const addressVal = ((data?.get("address") as string) ?? addressQuery).trim();
    const cityVal = ((data?.get("city") as string) ?? city).trim();

    if (!nameVal || !addressVal || !cityVal) {
      setStepError("Nom, adresse et ville sont obligatoires.");
      return;
    }
    // Uniquement à la création : en édition, coords peut rester tel quel (les coordonnées
    // déjà enregistrées du magasin) même si l'adresse n'a pas été retouchée, voir l'init de
    // `coords` plus haut. Sans ce garde-fou, un magasin peut se créer sans jamais avoir
    // sélectionné de suggestion (juste tapé l'adresse à la main sans cliquer dessus, ou
    // aucune suggestion pertinente trouvée) : lat/lng partent alors à (0, 0), un magasin
    // qui existe en base mais n'apparaît jamais sur la carte ni dans aucune recherche par
    // distance — constaté en conditions réelles sur deux magasins créés ainsi.
    if (mode === "create" && !coords) {
      setStepError(
        "Sélectionne une adresse dans la liste de suggestions, ou place le magasin directement sur la carte."
      );
      return;
    }
    setStepError(null);
    setStep(2);
  }

  function goToStep3() {
    const data = formRef.current ? new FormData(formRef.current) : null;
    setPreviewPhone(phone.trim());
    setPreviewHours(data ? parseHoursFromFormData(data) : store?.hours);
    setStep(3);
  }

  // On ne garde que les chiffres tapés/collés (lettres, espaces, tirets... ignorés à la
  // source) puis libphonenumber-js reformate lui-même en "04 78 00 00 00" au fil de la
  // frappe, plus fiable qu'une regex maison pour gérer espaces multiples, collages, etc.
  function handlePhoneChange(e: ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
    setPhone(new AsYouType("FR").input(digits));
  }

  function toggleClosedPeriod(day: Weekday, period: "morning" | "afternoon", checked: boolean) {
    setClosedPeriods((prev) => ({ ...prev, [day]: { ...prev[day], [period]: checked } }));
  }

  // Appuyer sur Entrée dans un champ soumet le formulaire nativement (donc l'action serveur)
  // même sans bouton submit à l'écran : on l'intercepte pour rester sur l'étape en cours tant
  // qu'elle n'est pas validée, au lieu de créer le magasin en sautant les étapes suivantes.
  function handleFormKeyDown(e: KeyboardEvent<HTMLFormElement>) {
    if (e.key !== "Enter") return;
    if (step === 1) {
      e.preventDefault();
      goToStep2();
    } else if (step === 2) {
      e.preventDefault();
      goToStep3();
    }
  }

  if (state?.success && !handledSuccess) {
    setHandledSuccess(true);
    setConfetti(makeConfetti(28));
    setShowSuccess(true);
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setHandledSuccess(false);
      setShowGuidelines(true);
    } else {
      resetForm();
    }
  }

  function handleConfirmGuidelines() {
    setShowGuidelines(false);
  }

  // API Adresse (Base Adresse Nationale), service officiel de l'État (IGN/Etalab),
  // gratuit et sans clé, plus fiable que Mapbox pour les adresses françaises.
  useEffect(() => {
    const query = addressQuery.trim();
    if (query.length < 3) return;

    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=5`,
          { signal: controller.signal }
        );
        const data = await res.json();
        const features = (data.features ?? []) as {
          properties: { name: string; city: string; postcode: string; score: number };
          geometry: { coordinates: [number, number] };
        }[];
        setSuggestions(
          features.map((f) => ({
            label: f.properties.name,
            city: f.properties.city,
            postalCode: f.properties.postcode,
            lat: f.geometry.coordinates[1],
            lng: f.geometry.coordinates[0],
          }))
        );
        // La BAN renvoie presque toujours QUELQUE CHOSE (recherche floue par tokens), même
        // pour une adresse qu'elle ne connaît pas vraiment (numéro absent, rue trop
        // récente...) : un score faible sur son meilleur résultat est un signal bien plus
        // fiable que "zéro résultat" pour détecter ce cas — c'est ce qui s'est produit en
        // conditions réelles ("Rue Jean Chaptal, Castres" ne renvoyait qu'un score ~0.56
        // sur une rue différente, jamais zéro résultat).
        const bestScore = features[0]?.properties.score ?? 0;
        setSearchedNoResults(bestScore < ADDRESS_MATCH_MIN_SCORE);
      } catch {
        // Requête annulée ou API indisponible : pas la faute de l'utilisateur, on ne
        // montre pas l'avertissement "adresse introuvable" dans ce cas précis.
      }
    }, 300);

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [addressQuery]);

  function selectSuggestion(s: AddressSuggestion) {
    setAddressQuery(s.label);
    setCity(s.city);
    setPostalCode(s.postalCode);
    setCoords({ lat: s.lat, lng: s.lng });
    setSuggestions([]);
    setShowSuggestions(false);
    setSearchedNoResults(false);
    // Choix explicite de l'utilisateur : un clic ultérieur sur la carte pour affiner le
    // pin ne doit plus écraser ce texte (voir pickOnMap).
    addressSourceRef.current = "manual";
  }

  // Nom, adresse et ville restent obligatoires (voir goToStep2) même en plaçant le pin
  // sur la carte : sans reverse-geocoding, l'utilisateur devrait retaper la ville à la
  // main après coup, alors que le clic sur la carte donne déjà tout ce qu'il faut pour
  // la déduire. N'écrase le texte que s'il ne vient PAS d'une saisie manuelle (voir
  // addressSourceRef) : un premier clic remplit adresse/ville vides, et un clic suivant
  // pour ajuster le pin peut donc les remettre à jour lui aussi — sans ce garde-fou basé
  // sur la source plutôt que "vide ou pas", seul le tout premier clic aurait d'effet,
  // laissant une adresse périmée derrière chaque ajustement suivant du pin.
  function pickOnMap(next: { lat: number; lng: number }) {
    setCoords(next);
    setSearchedNoResults(false);

    fetch(`https://api-adresse.data.gouv.fr/reverse/?lon=${next.lng}&lat=${next.lat}`)
      .then((res) => res.json())
      .then((data) => {
        if (addressSourceRef.current === "manual") return;
        const feature = data.features?.[0]?.properties as
          | { name?: string; city?: string; postcode?: string }
          | undefined;
        if (!feature) return;
        addressSourceRef.current = "map";
        setAddressQuery(feature.name ?? "");
        setCity(feature.city ?? "");
        setPostalCode(feature.postcode ?? "");
      })
      .catch(() => {
        // Best effort : la position reste utilisable même sans reverse-geocoding, il
        // faudra juste renseigner ville/adresse à la main dans ce cas.
      });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {mode === "create" ? (
          <Button type="button" variant="default" className="flex-1">
            <Plus className="size-4" />
            Ajouter un magasin
          </Button>
        ) : (
          <button
            type="button"
            aria-label="Modifier le magasin"
            className="text-muted-foreground hover:bg-accent flex size-6 shrink-0 items-center justify-center rounded-md"
          >
            <SquarePen className="size-3" />
          </button>
        )}
      </DialogTrigger>
      <DialogContent
        onEscapeKeyDown={(e) => {
          if (!showGuidelines) return;
          e.preventDefault();
          setShowGuidelines(false);
        }}
        onPointerDownOutside={(e) => {
          if (!showGuidelines) return;
          e.preventDefault();
          setShowGuidelines(false);
        }}
        onInteractOutside={(e) => {
          if (!showGuidelines) return;
          e.preventDefault();
          setShowGuidelines(false);
        }}
      >
        <div
          className={cn(
            "flex min-w-0 flex-col gap-4 transition-all duration-300",
            showGuidelines && "pointer-events-none brightness-[0.4]"
          )}
        >
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Ajouter un magasin" : `Modifier ${store?.name ?? "le magasin"}`}
          </DialogTitle>
        </DialogHeader>

        <form
          ref={formRef}
          action={formAction}
          onKeyDown={handleFormKeyDown}
          className="flex flex-col gap-4"
        >
          <input type="hidden" name="lat" value={coords?.lat ?? ""} />
          <input type="hidden" name="lng" value={coords?.lng ?? ""} />
          {/* En édition, le nom n'est plus un champ modifiable (voir plus bas) : le titre du
              dialogue suffit à le donner comme contexte, pas besoin de le réafficher dans
              un champ qu'on ne peut pas toucher. On garde quand même sa valeur en hidden
              pour que le serveur (qui l'exige) la reçoive. */}
          {mode === "edit" && <input type="hidden" name="name" value={name} />}

          <div className="flex gap-1.5">
            <div
              className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${step >= 1 ? "bg-primary" : "bg-muted"}`}
            />
            <div
              className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${step >= 2 ? "bg-primary" : "bg-muted"}`}
            />
            <div
              className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${step >= 3 ? "bg-primary" : "bg-muted"}`}
            />
          </div>

          <div
            className="overflow-hidden transition-[height] duration-300 ease-in-out"
            style={{ height: trackHeight }}
          >
            <div
              className="flex items-start transition-transform duration-300 ease-in-out"
              style={{ transform: `translateX(-${(step - 1) * 100}%)` }}
            >
          <div ref={(el) => measureStep(el, 1)} className="flex w-full shrink-0 flex-col gap-4">
            {/* Pas affiché du tout en édition (voir le hidden input name="name" plus haut) :
                changer le nom reviendrait à transformer la fiche en un tout autre magasin
                plutôt qu'à corriger une erreur, direction "signaler" (Doublon) si l'entrée
                est fausse. Un champ visible mais verrouillé n'apportait rien de plus que le
                titre du dialogue, qui donne déjà le nom en contexte. */}
            {mode === "create" && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="name" className="text-sm font-medium">
                  Nom
                </label>
                <Input
                  id="name"
                  name="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Carrefour City"
                />
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">Localisation</span>
                {coords && (
                  <span className="text-muted-foreground flex items-center gap-1 text-xs">
                    <Check className="text-primary size-3.5" />
                    Position définie
                  </span>
                )}
              </div>

              {/* Les deux façons de localiser le magasin sont visibles d'emblée, côte à
                  côte : un bouton "carte" caché sous le champ adresse se découvre trop
                  tard pour quelqu'un dont l'adresse n'est jamais dans les suggestions. */}
              <div className="bg-muted grid grid-cols-2 gap-1 rounded-md p-1">
                <button
                  type="button"
                  onClick={() => setLocationMethod("adresse")}
                  className={cn(
                    "flex items-center justify-center gap-1.5 rounded-sm py-1.5 text-sm font-medium transition-colors",
                    locationMethod === "adresse"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground"
                  )}
                >
                  <Search className="size-3.5" />
                  Saisir l&apos;adresse
                </button>
                <button
                  type="button"
                  onClick={() => setLocationMethod("carte")}
                  className={cn(
                    "flex items-center justify-center gap-1.5 rounded-sm py-1.5 text-sm font-medium transition-colors",
                    locationMethod === "carte"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground"
                  )}
                >
                  <MapPin className="size-3.5" />
                  Placer sur la carte
                </button>
              </div>

              {/* hidden plutôt qu'un rendu conditionnel : le champ doit rester monté (donc
                  présent dans le FormData à la soumission) même quand l'onglet Carte est
                  affiché, sans quoi la valeur déjà saisie disparaîtrait du formulaire. */}
              <div className="relative flex flex-col gap-1.5" hidden={locationMethod !== "adresse"}>
                <Input
                  id="address"
                  name="address"
                  autoComplete="off"
                  value={addressQuery}
                  onChange={(e) => {
                    setAddressQuery(e.target.value);
                    setCoords(null);
                    setSearchedNoResults(false);
                    addressSourceRef.current = e.target.value.trim() ? "manual" : null;
                    if (e.target.value.trim().length < 3) setSuggestions([]);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  placeholder="12 rue de la République"
                />
                {showSuggestions && suggestions.length > 0 && (
                  <ul className="bg-card absolute top-full z-20 mt-1 w-full overflow-hidden rounded-md border shadow-md">
                    {suggestions.map((s) => (
                      <li key={`${s.label}-${s.city}`}>
                        <button
                          type="button"
                          className="hover:bg-accent flex w-full flex-col items-start px-3 py-2 text-left text-sm"
                          onClick={() => selectSuggestion(s)}
                        >
                          <span>{s.label}</span>
                          <span className="text-muted-foreground text-xs">{s.city}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {searchedNoResults && !coords && (
                  <p className="flex items-start gap-1.5 text-xs text-amber-500">
                    <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
                    Adresse introuvable dans les suggestions (numéro absent, rue trop
                    récente...).{" "}
                    <button
                      type="button"
                      onClick={() => setLocationMethod("carte")}
                      className="underline underline-offset-2"
                    >
                      Place-le sur la carte
                    </button>{" "}
                    à la main.
                  </p>
                )}
              </div>

              {/* Contrairement au champ adresse (voir plus haut), démonté plutôt que
                  simplement masqué avec `hidden` : `coords` vit dans CE composant parent,
                  pas dans StoreLocationPicker, donc rien à perdre en le démontant. Et
                  Mapbox DOIT être monté dans un conteneur déjà visible et correctement
                  dimensionné — initialisé pendant que `hidden` (donc display:none) le
                  mesure à 0×0, il se rabat silencieusement sur une taille par défaut
                  (400×300) et ne se redimensionne jamais tout seul par la suite, même une
                  fois l'onglet affiché : la carte semblait alors ne pas remplir son
                  conteneur (constaté en conditions réelles). */}
              {locationMethod === "carte" && (
                <div className="flex flex-col gap-1.5">
                  <StoreLocationPicker coords={coords} onPick={pickOnMap} />
                  {coords && (city.trim() || addressQuery.trim()) && (
                    <p className="text-muted-foreground text-center text-xs">
                      Adresse détectée : {[addressQuery, city].filter(Boolean).join(", ") || "—"}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Masqués (pas retirés : name="postalCode"/"city"/"phone" doivent rester dans
                le FormData) pendant que l'onglet Carte est actif — la carte, déjà haute
                (voir StoreLocationPicker), plus ces trois champs dépassait la hauteur
                utilisable du dialogue (max-h-[90vh]) sur un écran de téléphone standard.
                Le dialogue devenait alors scrollable, mais sans indicateur visible (voir
                DialogContent, "no-scrollbar") : ça donnait l'impression que tout
                s'arrêtait net juste après la carte plutôt que d'inviter à faire défiler.
                Code postal/ville restent consultables via "Adresse détectée" au-dessus ;
                revenir sur l'onglet "Saisir l'adresse" les réaffiche pour les modifier. */}
            <div hidden={locationMethod === "carte"} className="flex flex-col gap-4">
              <div className="flex gap-3">
                <div className="flex w-24 shrink-0 flex-col gap-1.5">
                  <label htmlFor="postalCode" className="text-sm font-medium">
                    Code postal
                  </label>
                  <Input
                    id="postalCode"
                    name="postalCode"
                    inputMode="numeric"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="69002"
                  />
                </div>
                <div className="flex flex-1 flex-col gap-1.5">
                  <label htmlFor="city" className="text-sm font-medium">
                    Ville
                  </label>
                  <Input
                    id="city"
                    name="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Lyon"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="phone" className="text-sm font-medium">
                  Téléphone (optionnel)
                </label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={phone}
                  onChange={handlePhoneChange}
                  placeholder="04 78 00 00 00"
                />
              </div>
            </div>

            {stepError && <p className="text-destructive text-sm">{stepError}</p>}
          </div>

          <div ref={(el) => measureStep(el, 2)} className="flex w-full shrink-0 flex-col gap-1.5">
            <span className="text-sm font-medium">Horaires d&apos;ouverture (optionnel)</span>
            {/* Hauteur bornée + défilement propre à cette liste (plutôt que de laisser les 7
                cartes pousser toute la hauteur de l'étape) : sans ça, le pied de page sticky
                Retour/Suivant se retrouve planté au milieu du défilement du dialogue entier,
                avec des jours visibles au-dessus ET en dessous des boutons — pas très propre.
                Ici, les boutons restent un vrai pied de page fixe sous une liste qui défile
                dans sa propre boîte, avec sa barre de défilement native comme indice qu'il y
                a plus de jours à voir. */}
            <div className="flex max-h-[min(66vh,30rem)] flex-col gap-2 overflow-y-auto pr-1">
              {days.map(({ key, label }) => {
                const isClosed = closedDays[key] ?? false;
                const morningClosed = closedPeriods[key]?.morning ?? false;
                const afternoonClosed = closedPeriods[key]?.afternoon ?? false;
                const dayHours = store?.hours?.[key];

                return (
                  <div key={key} className="bg-background flex flex-col gap-2 rounded-md border p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{label}</span>
                      <label className="flex items-center gap-1.5">
                        <Checkbox
                          name={`hours_${key}_closed`}
                          checked={isClosed}
                          onCheckedChange={(checked) =>
                            setClosedDays((prev) => ({ ...prev, [key]: checked === true }))
                          }
                        />
                        <span className="text-muted-foreground text-xs">Fermé toute la journée</span>
                      </label>
                    </div>

                    {!isClosed && (
                      <>
                        <PeriodFields
                          dayKey={key}
                          period="morning"
                          label="Matin"
                          closed={morningClosed}
                          defaultOpen={dayHours?.morningOpen}
                          defaultClose={dayHours?.morningClose}
                          onToggleClosed={(checked) => toggleClosedPeriod(key, "morning", checked)}
                        />
                        <PeriodFields
                          dayKey={key}
                          period="afternoon"
                          label="Après-midi"
                          closed={afternoonClosed}
                          defaultOpen={dayHours?.afternoonOpen}
                          defaultClose={dayHours?.afternoonClose}
                          onToggleClosed={(checked) => toggleClosedPeriod(key, "afternoon", checked)}
                        />
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {state?.error && <p className="text-destructive text-sm">{state.error}</p>}
          </div>

          {/* Aperçu calqué sur StoreInfoPanel (la fiche magasin de l'onglet Carte) : mêmes
              blocs (nom, adresse, téléphone, horaires, auteur, vote/actions), mais actions
              désactivées puisque rien n'est encore enregistré. */}
          <div ref={(el) => measureStep(el, 3)} className="flex w-full shrink-0 flex-col gap-3">
            <p className="text-sm font-medium">Aperçu</p>
            <div className="relative">
            <Card className={cn("gap-3 p-4", showSuccess && "animate-card-launch")}>
              <p className="truncate text-sm font-semibold">{name || "…"}</p>

              <p className="text-muted-foreground flex items-start gap-1.5 text-xs">
                <MapPin className="mt-0.5 size-3 shrink-0" />
                <span className="min-w-0">
                  {addressQuery || "…"}
                  {city && `, ${city}`}
                </span>
              </p>
              {previewPhone && (
                <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
                  <Phone className="size-3 shrink-0" />
                  {previewPhone}
                </p>
              )}

              {previewHours && Object.keys(previewHours).length > 0 && (
                <div className="flex flex-col gap-0.5 text-[11px]">
                  {weekdayOrder
                    .filter((day) => previewHours[day])
                    .map((day) => (
                      <div key={day} className="flex justify-between gap-2">
                        <span className="text-muted-foreground shrink-0">
                          {dayLabels[day].slice(0, 3)}
                        </span>
                        <span className="truncate">{formatDayHours(previewHours[day]!)}</span>
                      </div>
                    ))}
                </div>
              )}

              <p className="text-muted-foreground/70 flex items-center gap-1 text-xs">
                {mode === "create" ? "Créé par" : "Modifié par"} {currentUser?.pseudo ?? "Toi"}
                {currentUser && <TierBadge tier={currentUser.tier} isAdmin={currentUser.isAdmin} />}
                <span>· à l&apos;instant</span>
              </p>

              <div className="flex items-center justify-between gap-2">
                <div className="flex flex-nowrap items-center gap-0">
                  <div className="flex items-center">
                    <button
                      type="button"
                      disabled
                      aria-label="Confirmer ce magasin"
                      className="text-muted-foreground flex size-6 shrink-0 items-center justify-center rounded-md disabled:opacity-50"
                    >
                      <ThumbsUp className="size-3" />
                    </button>
                    <span className="text-muted-foreground text-[11px] tabular-nums">
                      {store?.likes ?? 0}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <button
                      type="button"
                      disabled
                      aria-label="Contester ce magasin"
                      className="text-muted-foreground flex size-6 shrink-0 items-center justify-center rounded-md disabled:opacity-50"
                    >
                      <ThumbsDown className="size-3" />
                    </button>
                    <span className="text-muted-foreground text-[11px] tabular-nums">
                      {store?.reports ?? 0}
                    </span>
                  </div>
                  <ConfidenceBadge
                    confidence={storeConfidence(store?.likes ?? 0, store?.reports ?? 0)}
                    className="ml-2 h-4 px-0.5 py-0 text-[10px] leading-none"
                  />
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    disabled
                    aria-label="Signaler ce magasin"
                    className="text-muted-foreground flex size-6 shrink-0 items-center justify-center rounded-md disabled:opacity-50"
                  >
                    <Flag className="size-3" />
                  </button>
                  <button
                    type="button"
                    disabled
                    aria-label="Modifier le magasin"
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
                    ? "Ton magasin a été ajouté avec succès."
                    : "Tes modifications ont été enregistrées."}
                </p>
              </div>
            )}
            </div>
            {!showSuccess && (
              <p className="text-muted-foreground text-xs">
                {mode === "create"
                  ? "Vérifie que tout est correct avant d'ajouter le magasin."
                  : "Vérifie que tout est correct avant d'enregistrer les modifications."}
              </p>
            )}
          </div>
            </div>
          </div>

          {/* sticky + marges négatives pour revenir aux bords du dialogue (qui a p-5, voir
              DialogContent) : sur un écran/une fenêtre bas(se), le contenu de l'étape (en
              particulier la carte manuelle, assez haute) peut dépasser la hauteur visible
              du dialogue. Sans ça, "Annuler"/"Suivant" scrollaient hors champ avec le
              reste du contenu, sans indicateur visible (DialogContent masque sa barre de
              défilement) — impossible de deviner qu'il fallait faire défiler pour les
              atteindre. Toujours ancré en bas désormais, quelle que soit la hauteur du
              contenu au-dessus. */}
          <DialogFooter
            className={cn(
              "bg-card sticky bottom-0 z-10 -mx-5 -mb-5 px-5 pt-5 pb-5",
              showSuccess && "hidden"
            )}
          >
            {step === 1 ? (
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
            ) : step === 2 ? (
              <div key="step-2" className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(1)}>
                  Retour
                </Button>
                <Button type="button" className="flex-1" onClick={goToStep3}>
                  Suivant
                </Button>
              </div>
            ) : (
              <div key="step-3" className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(2)}>
                  Retour
                </Button>
                <Button type="submit" disabled={isPending} className="flex-1">
                  {mode === "create"
                    ? isPending
                      ? "Ajout..."
                      : "Ajouter le magasin"
                    : isPending
                      ? "Enregistrement..."
                      : "Enregistrer"}
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
            <div
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                handleConfirmGuidelines();
              }}
              onKeyDown={(e) => {
                if (e.key !== "Enter" && e.key !== " ") return;
                e.preventDefault();
                e.stopPropagation();
                handleConfirmGuidelines();
              }}
              className="animate-alert-in border-amber-500/50 bg-card text-muted-foreground relative flex w-full cursor-pointer flex-col gap-2 overflow-hidden rounded-md border p-4 pt-5 pb-5 text-xs shadow-2xl"
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
                {mode === "create" ? "Avant d'ajouter ce magasin" : "Avant de modifier ce magasin"}
              </p>
              <ul className="list-disc space-y-0.5 pl-4">
                {mode === "create" ? (
                  <>
                    <li>Magasin réellement existant</li>
                    <li>Adresse exacte</li>
                    <li>Déjà référencé ? Ne le recrée pas, cherche-le d&apos;abord dans la liste</li>
                    <li>Orthographe et majuscules soignées, pour le bien de tous</li>
                  </>
                ) : (
                  <>
                    <li>Modifications exactes</li>
                    <li>Infos toujours correctes pour ce magasin</li>
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
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function NouveauMagasinDialog({ currentUser }: { currentUser?: AuthorInfo }) {
  return <MagasinDialog mode="create" currentUser={currentUser} />;
}

export function ModifierMagasinDialog({
  store,
  currentUser,
}: {
  store: Store;
  currentUser?: AuthorInfo;
}) {
  return <MagasinDialog mode="edit" store={store} currentUser={currentUser} />;
}
