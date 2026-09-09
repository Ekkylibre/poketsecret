"use client";

import { Bell, BellOff, Lock } from "lucide-react";
import { useSyncExternalStore } from "react";

import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

// Préférence propre à l'app, distincte de la permission navigateur : une fois "granted",
// impossible de la retirer en JS (seuls les réglages du navigateur le peuvent), donc c'est
// ce drapeau local qui pilote l'intention "je veux/veux plus être notifié" une fois acquise.
const PREF_KEY = "poketsecret-notifications-enabled";

export type NotificationSupport = "unsupported" | NotificationPermission;

// useSyncExternalStore plutôt qu'un useEffect + setState au montage : Notification.permission
// et localStorage n'existent pas côté serveur, donc lire leur valeur "au montage" via un effet
// déclenche un setState synchrone dans l'effet (interdit par react-hooks/set-state-in-effect).
// Ce mini pub/sub laisse React réconcilier lui-même le rendu serveur (valeur par défaut) avec
// la vraie valeur client, sans mismatch d'hydratation ni setState manuel.
const listeners = new Set<() => void>();

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function notify() {
  listeners.forEach((callback) => callback());
}

function getSupportSnapshot(): NotificationSupport {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

function getSupportServerSnapshot(): NotificationSupport {
  return "unsupported";
}

function getPrefSnapshot(): boolean {
  return typeof window === "undefined" ? true : localStorage.getItem(PREF_KEY) !== "0";
}

function getPrefServerSnapshot(): boolean {
  return true;
}

function setPref(enabled: boolean) {
  localStorage.setItem(PREF_KEY, enabled ? "1" : "0");
  notify();
}

/** Partagé entre le toggle des réglages et la bulle d'incitation sur le profil. */
export function useNotificationPermission() {
  const support = useSyncExternalStore(subscribe, getSupportSnapshot, getSupportServerSnapshot);
  const prefEnabled = useSyncExternalStore(subscribe, getPrefSnapshot, getPrefServerSnapshot);
  const enabled = support === "granted" && prefEnabled;

  async function enable() {
    if (support === "default") {
      const result = await Notification.requestPermission();
      notify();
      if (result !== "granted") return;
      new Notification("PokéSecret", {
        body: "Notifications activées, tu seras alerté ici.",
      });
    }
    if (support === "denied") return;
    setPref(true);
  }

  function disable() {
    setPref(false);
  }

  return { support, enabled, enable, disable };
}

export function NotificationPermissionToggle({
  premiumLocked,
  className,
}: {
  premiumLocked: boolean;
  /** Remplace le padding par défaut (px-4 py-3), utile quand le composant n'est plus
   *  posé en pleine largeur de card mais dans une colonne déjà indentée. */
  className?: string;
}) {
  const { support, enabled, enable, disable } = useNotificationPermission();

  if (premiumLocked) {
    return (
      <div className={cn("flex items-center justify-between gap-3 px-4 py-3", className)}>
        <div className="text-muted-foreground/50 flex min-w-0 items-start gap-1.5">
          <Lock className="mt-0.5 size-3.5 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium">Notifications du navigateur</p>
            <p className="text-xs">Fonctionnalité Premium.</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <BellOff className="text-muted-foreground/50 size-4" />
          <Switch checked={false} disabled />
        </div>
      </div>
    );
  }

  if (support === "unsupported") {
    return (
      <p className={cn("text-muted-foreground px-4 py-3 text-xs", className)}>
        Notifications non prises en charge par ce navigateur.
      </p>
    );
  }

  return (
    <div className={cn("flex items-center justify-between gap-3 px-4 py-3", className)}>
      <div className="min-w-0">
        <p className="text-sm font-medium">Notifications du navigateur</p>
        {/* Le cas "pas encore demandé" a déjà la bulle d'incitation pour expliquer
            pourquoi les activer, pas besoin de le redire ici — seul "bloquées" reste
            une info que la bulle ne donne pas. */}
        {support === "denied" && (
          <p className="text-muted-foreground text-xs">
            Bloquées, à réactiver dans les réglages du navigateur.
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {enabled ? (
          <Bell className="size-4" />
        ) : (
          <BellOff className="text-muted-foreground animate-bell-shake size-4 origin-top" />
        )}
        <Switch
          checked={enabled}
          onCheckedChange={(next) => (next ? enable() : disable())}
          disabled={support === "denied"}
        />
      </div>
    </div>
  );
}
