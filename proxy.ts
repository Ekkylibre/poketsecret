import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Domaines externes réellement appelés par le navigateur (voir components/carte-explorer.tsx
// pour Mapbox, lib/tcgdex.ts + le champ imageUrl des produits pour les logos TCGdex, et
// lib/blob.ts pour les photos uploadées). Tout le reste est chargé depuis 'self'.
const MAPBOX_HOSTS = "https://api.mapbox.com https://events.mapbox.com https://*.tiles.mapbox.com";

function buildCsp(nonce: string): string {
  const isDev = process.env.NODE_ENV !== "production";
  const directives = [
    "default-src 'self'",
    // 'strict-dynamic' fait confiance aux scripts chargés par un script déjà autorisé
    // (nonce) : c'est ce qui permet à Next.js de charger ses chunks sans avoir à
    // allowlister chaque URL. 'unsafe-eval' n'est nécessaire qu'en dev (HMR/Turbopack).
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https:${isDev ? " 'unsafe-eval'" : ""}`,
    // 'unsafe-inline' seulement pour les styles : les attributs style="" (posés par
    // Next.js lui-même, Radix, mapbox-gl) ne peuvent pas être noncés, contrairement aux
    // <script>. Une injection CSS n'exécute pas de JS, risque bien moindre.
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: https://assets.tcgdex.net https://*.public.blob.vercel-storage.com ${MAPBOX_HOSTS}`,
    "font-src 'self' data:",
    `connect-src 'self' ${MAPBOX_HOSTS}${isDev ? " ws://localhost:* http://localhost:*" : ""}`,
    // mapbox-gl exécute ses workers depuis des blob: URLs.
    "worker-src 'self' blob:",
    "frame-ancestors 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ];
  return directives.join("; ");
}

// Anti-brute-force minimal sur les routes d'auth (connexion, OTP, reset) : Neon Auth ne
// laisse pas configurer de rate limit côté SDK (voir node_modules/@neondatabase/auth),
// donc rien ne protégeait ces endpoints. Fenêtre glissante en mémoire par IP : imparfait
// (par instance de fonction, pas partagé entre régions/instances), mais bien mieux que
// l'absence totale de limite constatée en pentest. Si le trafic justifie plus de rigueur
// un jour, remplacer par un store partagé (ex. Upstash Redis via Vercel Marketplace).
const AUTH_RATE_LIMIT = { windowMs: 60_000, maxRequests: 10 };
const authAttempts = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = (authAttempts.get(ip) ?? []).filter(
    (t) => now - t < AUTH_RATE_LIMIT.windowMs
  );
  timestamps.push(now);
  authAttempts.set(ip, timestamps);
  // Purge occasionnelle pour ne pas garder des IP inactives indéfiniment en mémoire.
  if (authAttempts.size > 5000) {
    for (const [key, times] of authAttempts) {
      if (times.every((t) => now - t >= AUTH_RATE_LIMIT.windowMs)) authAttempts.delete(key);
    }
  }
  return timestamps.length > AUTH_RATE_LIMIT.maxRequests;
}

function clientIp(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/auth/") && request.method === "POST") {
    if (isRateLimited(clientIp(request))) {
      return new NextResponse("Trop de tentatives, réessaie dans une minute.", { status: 429 });
    }
  }

  const nonce = crypto.randomUUID().replace(/-/g, "");
  const csp = buildCsp(nonce);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    // Toutes les pages (pour le nonce CSP), sauf les assets statiques qui n'en ont pas besoin.
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js).*)",
  ],
};
