// Service worker dédié au Web Push : tourne indépendamment de tout onglet ouvert, c'est
// ce qui permet de recevoir une notification même app fermée. Ne gère volontairement rien
// d'autre (pas de cache offline) : la seule raison d'être de ce fichier est de réveiller
// le navigateur sur un push et d'afficher la notification.

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: "PoketSecret", body: event.data ? event.data.text() : "" };
  }

  const title = payload.title || "PoketSecret";
  const url = payload.url || "/notifications";

  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body || "",
      icon: "/icon.svg",
      // data.url plutôt qu'un simple string : notificationclick lit cette structure,
      // garder la même forme que le payload envoyé côté serveur (lib/push.ts).
      data: { url },
    })
  );
});

// Clique sur la notification : réutilise un onglet déjà ouvert sur l'app si possible
// plutôt que d'en ouvrir un nouveau à chaque fois.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/notifications";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
