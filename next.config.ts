import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  // Par défaut en bas à gauche, ça chevauche la BottomNav sur les petits écrans (app
  // mobile-first) : dev only, jamais en prod, mais gênant pour tester en responsive.
  devIndicators: {
    position: "top-right",
  },
  experimental: {
    serverActions: {
      // Next.js plafonne les Server Actions à 1 Mo par défaut : une vraie photo de
      // smartphone dépasse ça une fois encodée en data URL base64 (+33% de volume), ce
      // qui faisait planter enregistrerProduit sur mobile avec une 413 générique.
      // 15 Mo laisse de la marge sur la limite de 10 Mo déjà imposée par lib/blob.ts
      // (image décodée) + le surcoût du base64 et des autres champs du formulaire.
      bodySizeLimit: "15mb",
    },
  },
  // N'annonce pas "propulsé par Next.js" au monde entier, aucune raison de faciliter le
  // fingerprinting. La CSP (protection XSS/clickjacking) est posée dans proxy.ts, pas
  // ici : elle a besoin d'un nonce généré par requête pour laisser passer les scripts
  // inline que Next.js injecte lui-même à l'hydratation.
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // geolocation=(self) : la carte centre sur la position de l'utilisateur.
          // Le reste (micro, caméra via getUserMedia, paiement, capteurs...) n'est
          // utilisé nulle part dans l'app.
          {
            key: "Permissions-Policy",
            value: "geolocation=(self), microphone=(), payment=(), usb=(), magnetometer=(), midi=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
