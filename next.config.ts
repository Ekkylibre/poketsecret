import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  // N'annonce pas "propulsé par Next.js" au monde entier, aucune raison de faciliter le
  // fingerprinting. La CSP (protection XSS/clickjacking) est posée dans middleware.ts,
  // pas ici : elle a besoin d'un nonce généré par requête pour laisser passer les scripts
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
