import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

export const alt = "PoketSecret, suivi de la disponibilité des produits TCG Pokémon en magasin";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// L'icône contient des <mask>/<clipPath>/gradient SVG que le moteur de rendu de next/og
// (Satori) ne sait pas interpréter s'il doit les recréer lui-même en JSX, donc on la
// passe telle quelle en <img> (data URI), ce que Satori se contente d'intégrer tel quel.
const iconSvg = await readFile(join(process.cwd(), "app/icon.svg"), "utf-8");
const iconSrc = `data:image/svg+xml;base64,${Buffer.from(iconSvg).toString("base64")}`;

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 28,
          background: "hsl(220, 20%, 8%)",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- data URL locale, next/image ne s'applique pas à next/og */}
        <img src={iconSrc} width={220} height={220} alt="" />
        <div style={{ display: "flex", fontSize: 72, fontWeight: 700, color: "#f3efe4" }}>
          Poket<span style={{ color: "#f2a93c" }}>Secret</span>
        </div>
        {/* Version courte pour l'image (place limitée, pas de place pour la parenthèse
            "boosters, displays, coffrets" de metadata.description) : des exemples concrets
            directement dans la phrase plutôt que "produits" seul, ambigu (figurines...). */}
        <div style={{ display: "flex", fontSize: 28, color: "#9a9488" }}>
          Le radar des réassorts boosters & coffrets Pokémon
        </div>
      </div>
    ),
    { ...size }
  );
}
