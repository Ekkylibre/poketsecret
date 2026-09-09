import { useId } from "react";

export function Logo({
  className,
  shimmer,
}: {
  className?: string;
  /** Highlight qui balaie le logo en boucle (écran de chargement) : même principe que le
   *  highlight des cards produit (.shimmer-wrapper, voir availability-card.tsx), mais géré
   *  ici en SVG plutôt qu'en CSS pour pouvoir le masquer aux formes réellement dessinées
   *  (anneau + bille) au lieu du carré englobant, qui inclurait les vides entre les
   *  segments de l'anneau et l'espace vide autour de la bille. */
  shimmer?: boolean;
}) {
  // id préfixés par instance : le logo peut s'afficher deux fois en même temps (écran de
  // chargement au-dessus d'une page qui l'utilise déjà), et des id SVG dupliqués
  // casseraient les références url(#...) du deuxième exemplaire.
  const uid = useId();
  const gradId = `logoGoldGrad-${uid}`;
  const clipId = `logoOrbClip-${uid}`;
  const maskId = `logoRingGapMask-${uid}`;
  const shimmerMaskId = `logoShimmerMask-${uid}`;
  const shimmerGradId = `logoShimmerGrad-${uid}`;

  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={gradId} x1="20" y1="8" x2="82" y2="72" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#f6c877" />
          <stop offset="1" stopColor="#c97f1f" />
        </linearGradient>
        <clipPath id={clipId}>
          <circle cx="50" cy="50" r="30" />
        </clipPath>
        <mask id={maskId}>
          <rect x="0" y="0" width="100" height="100" fill="#fff" />
          <rect x="46" y="6" width="8" height="12" fill="#000" />
          <rect x="46" y="82" width="8" height="12" fill="#000" />
          <rect x="82" y="46" width="12" height="8" fill="#000" />
          <rect x="6" y="46" width="12" height="8" fill="#000" />
        </mask>
        {shimmer && (
          <>
            {/* Union des zones réellement peintes (bille pleine + bande de l'anneau, avec
                ses 4 vides) : le highlight ne traverse que ce que ces formes couvrent. */}
            <mask id={shimmerMaskId}>
              <circle cx="50" cy="50" r="30" fill="#fff" />
              <g mask={`url(#${maskId})`}>
                <circle cx="50" cy="50" r="38" fill="none" stroke="#fff" strokeWidth="8" />
              </g>
            </mask>
            {/* Bande diagonale animée via gradientTransform (SMIL), pas un transform CSS
                sur l'élément masqué : un transform CSS animé sur une forme portant (ou
                héritant d'un ancêtre) un mask SVG déforme le mask en cours d'animation
                dans Chromium (déjà rencontré sur la rotation de l'anneau). Ici seul le
                dégradé bouge, la géométrie du rect masqué reste fixe. */}
            <linearGradient
              id={shimmerGradId}
              gradientUnits="userSpaceOnUse"
              x1="0"
              y1="0"
              x2="26"
              y2="26"
            >
              <stop offset="0" stopColor="#fff" stopOpacity="0" />
              <stop offset="0.5" stopColor="#fff" stopOpacity="0.6" />
              <stop offset="1" stopColor="#fff" stopOpacity="0" />
              <animateTransform
                attributeName="gradientTransform"
                type="translate"
                values="-40 -40; 140 140"
                dur="2s"
                repeatCount="indefinite"
              />
            </linearGradient>
          </>
        )}
      </defs>

      {/* rayon 38, épaisseur 8 => bord intérieur à 34 : un écart net avec le bord de la
          bille (30, +0.8 avec son propre contour) pour que l'anneau reste bien AUTOUR
          d'elle, séparé, plutôt que de sembler la toucher. Fixe, sans animation dessus. */}
      <g mask={`url(#${maskId})`} fill="none">
        <circle cx="50" cy="50" r="38" stroke="#12141a" strokeWidth="8" />
        <circle cx="50" cy="50" r="38" stroke="#f2a93c" strokeWidth="5" />
      </g>

      <g clipPath={`url(#${clipId})`}>
        <rect x="0" y="0" width="100" height="50" fill={`url(#${gradId})`} />
        <rect x="0" y="50" width="100" height="50" fill="#12141a" />
        <rect x="0" y="45" width="100" height="7" fill="#c97f1f" />
      </g>
      <circle cx="50" cy="50" r="30" fill="none" stroke="#12141a" strokeWidth="1.6" />
      <path
        d="M34.3 31.6a19.1 19.1 0 0 1 14.3-6.8"
        stroke="#f6f1e6"
        strokeWidth="2.2"
        strokeLinecap="round"
        fill="none"
        opacity="0.32"
      />
      <circle cx="50" cy="50" r="9" fill="#12141a" stroke="#c97f1f" strokeWidth="1.8" />
      <circle cx="50" cy="50" r="4.8" fill="#f2a93c" />

      {shimmer && (
        <rect
          x="0"
          y="0"
          width="100"
          height="100"
          fill={`url(#${shimmerGradId})`}
          mask={`url(#${shimmerMaskId})`}
          className="mix-blend-screen"
        />
      )}
    </svg>
  );
}
