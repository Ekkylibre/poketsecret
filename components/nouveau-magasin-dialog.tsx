"use client";

import { Plus, SquarePen } from "lucide-react";
import { type KeyboardEvent, useActionState, useEffect, useRef, useState } from "react";

import { creerMagasin, modifierMagasin } from "@/app/(tabs)/magasins/nouveau/actions";
import { Button } from "@/components/ui/button";
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
import type { Store, Weekday } from "@/lib/types";
import { PHONE_PATTERN } from "@/lib/utils";

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
            className="h-8 w-fit text-xs"
          />
          <span className="text-muted-foreground text-xs">–</span>
          <Input
            type="time"
            name={`hours_${dayKey}_${period}Close`}
            defaultValue={defaultClose}
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

function MagasinDialog({ mode, store }: { mode: "create" | "edit"; store?: Store }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const action = mode === "edit" && store ? modifierMagasin.bind(null, store.id) : creerMagasin;
  const [state, formAction, isPending] = useActionState(action, null);
  const [handledSuccess, setHandledSuccess] = useState(false);

  const [step, setStep] = useState<1 | 2>(1);
  const [stepError, setStepError] = useState<string | null>(null);
  const [name, setName] = useState(store?.name ?? "");
  const [addressQuery, setAddressQuery] = useState(store?.address ?? "");
  const [city, setCity] = useState(store?.city ?? "");
  const [postalCode, setPostalCode] = useState(store?.postalCode ?? "");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    store && (store.lat !== 0 || store.lng !== 0) ? { lat: store.lat, lng: store.lng } : null
  );
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [closedDays, setClosedDays] = useState<Partial<Record<Weekday, boolean>>>(() =>
    initialClosedDays(store)
  );
  const [closedPeriods, setClosedPeriods] = useState<
    Partial<Record<Weekday, { morning?: boolean; afternoon?: boolean }>>
  >(() => initialClosedPeriods(store));

  function resetForm() {
    setStep(1);
    setStepError(null);
    setName(store?.name ?? "");
    setAddressQuery(store?.address ?? "");
    setCity(store?.city ?? "");
    setPostalCode(store?.postalCode ?? "");
    setCoords(store && (store.lat !== 0 || store.lng !== 0) ? { lat: store.lat, lng: store.lng } : null);
    setSuggestions([]);
    setShowSuggestions(false);
    setClosedDays(initialClosedDays(store));
    setClosedPeriods(initialClosedPeriods(store));
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
    setStepError(null);
    setStep(2);
  }

  function toggleClosedPeriod(day: Weekday, period: "morning" | "afternoon", checked: boolean) {
    setClosedPeriods((prev) => ({ ...prev, [day]: { ...prev[day], [period]: checked } }));
  }

  // Appuyer sur Entrée dans un champ soumet le formulaire nativement (donc l'action serveur)
  // même sans bouton submit à l'écran : on l'intercepte pour rester sur l'étape 1 tant qu'elle
  // n'est pas validée, au lieu de créer le magasin en sautant les horaires.
  function handleFormKeyDown(e: KeyboardEvent<HTMLFormElement>) {
    if (e.key !== "Enter" || step !== 1) return;
    e.preventDefault();
    goToStep2();
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

  // API Adresse (Base Adresse Nationale) — service officiel de l'État (IGN/Etalab),
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
        setSuggestions(
          (data.features ?? []).map(
            (f: {
              properties: { name: string; city: string; postcode: string };
              geometry: { coordinates: [number, number] };
            }) => ({
              label: f.properties.name,
              city: f.properties.city,
              postalCode: f.properties.postcode,
              lat: f.geometry.coordinates[1],
              lng: f.geometry.coordinates[0],
            })
          )
        );
      } catch {
        // Requête annulée ou API indisponible : l'utilisateur peut toujours saisir à la main.
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Ajouter un magasin" : "Modifier le magasin"}</DialogTitle>
        </DialogHeader>

        <form
          ref={formRef}
          action={formAction}
          onKeyDown={handleFormKeyDown}
          className="flex flex-col gap-4"
        >
          <input type="hidden" name="lat" value={coords?.lat ?? ""} />
          <input type="hidden" name="lng" value={coords?.lng ?? ""} />

          <div className="flex gap-1.5">
            <div className={`h-1.5 flex-1 rounded-full ${step >= 1 ? "bg-primary" : "bg-muted"}`} />
            <div className={`h-1.5 flex-1 rounded-full ${step >= 2 ? "bg-primary" : "bg-muted"}`} />
          </div>

          <div className={step === 1 ? "flex flex-col gap-4" : "hidden"}>
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

            <div className="relative flex flex-col gap-1.5">
              <label htmlFor="address" className="text-sm font-medium">
                Adresse
              </label>
              <Input
                id="address"
                name="address"
                autoComplete="off"
                value={addressQuery}
                onChange={(e) => {
                  setAddressQuery(e.target.value);
                  setCoords(null);
                  if (e.target.value.trim().length < 3) setSuggestions([]);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                placeholder="12 rue de la République"
              />
              {showSuggestions && suggestions.length > 0 && (
                <ul className="bg-card absolute top-full z-10 mt-1 w-full overflow-hidden rounded-md border shadow-md">
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
            </div>

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
                pattern={PHONE_PATTERN}
                title="Numéro français valide, ex. 04 78 00 00 00"
                defaultValue={store?.phone}
                placeholder="04 78 00 00 00"
              />
            </div>

            {stepError && <p className="text-destructive text-sm">{stepError}</p>}
          </div>

          <div className={step === 2 ? "flex flex-col gap-1.5" : "hidden"}>
            <span className="text-sm font-medium">Horaires d&apos;ouverture (optionnel)</span>
            <div className="flex flex-col gap-2">
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

          <DialogFooter>
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
            ) : (
              <div key="step-2" className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(1)}>
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
      </DialogContent>
    </Dialog>
  );
}

export function NouveauMagasinDialog() {
  return <MagasinDialog mode="create" />;
}

export function ModifierMagasinDialog({ store }: { store: Store }) {
  return <MagasinDialog mode="edit" store={store} />;
}
