"use client";

import { Bell, BellOff, Lock } from "lucide-react";
import { useSyncExternalStore } from "react";

import { deletePushSubscription, savePushSubscription } from "@/app/(tabs)/profil/actions";
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

// pushManager.subscribe() attend la clé VAPID publique en Uint8Array, pas en base64url
// texte tel que généré/stocké : conversion standard, il n'y a pas d'API navigateur pour
// ça directement.
function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64Safe);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

/** Enregistre le service worker (idempotent : no-op si déjà enregistré) et souscrit au
 *  push navigateur, indépendant de tout onglet ouvert une fois fait. C'est cette étape,
 *  distincte de la simple permission Notification, qui permet de recevoir une
 *  notification app fermée. */
async function subscribeToPush() {
  const registration = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!publicKey) return;

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });
  await savePushSubscription(subscription.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } });
}

async function unsubscribeFromPush() {
  if (!("serviceWorker" in navigator)) return;
  const registration = await navigator.serviceWorker.getRegistration("/sw.js");
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;
  await deletePushSubscription(subscription.endpoint);
  await subscription.unsubscribe();
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
    }
    if (support === "denied") return;
    // Best effort : si l'abonnement échoue (réseau, clé VAPID absente...), l'utilisateur
    // reste avec la permission navigateur accordée mais sans push actif : pas idéal, mais
    // pas bloquant pour le reste de l'app, donc pas d'erreur remontée à l'UI ici.
    await subscribeToPush().catch(() => {});
    setPref(true);
  }

  function disable() {
    setPref(false);
    unsubscribeFromPush().catch(() => {});
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
            <p className="text-sm font-medium">Notifications</p>
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
        <p className="text-sm font-medium">Notifications</p>
        {/* Le cas "pas encore demandé" a déjà la bulle d'incitation pour expliquer
            pourquoi les activer, pas besoin de le redire ici : seul "bloquées" reste
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
