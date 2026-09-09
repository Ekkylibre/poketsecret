import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

// 180×180 : la plus grande taille d'apple-touch-icon standard, celle qu'iOS choisit sur
// les iPhone/iPad récents (Safari ignore les favicons SVG pour "Sur l'écran d'accueil",
// il lui faut ce fichier dédié).
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const iconSvg = await readFile(join(process.cwd(), "app/icon.svg"), "utf-8");
const iconSrc = `data:image/svg+xml;base64,${Buffer.from(iconSvg).toString("base64")}`;

export default async function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          // Fond opaque, pas de transparence : iOS applique lui-même les coins arrondis
          // et rend le transparent en noir sur certaines versions.
          background: "hsl(220, 20%, 8%)",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- data URL locale, next/image ne s'applique pas à next/og */}
        <img src={iconSrc} width={132} height={132} alt="" />
      </div>
    ),
    { ...size }
  );
}
