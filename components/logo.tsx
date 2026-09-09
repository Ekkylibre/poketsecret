import { useId } from "react";

const WAVE_ARCS = [
  "M56.60 12.58 A38 38 0 0 1 87.42 43.40",
  "M87.42 56.60 A38 38 0 0 1 56.60 87.42",
  "M43.40 87.42 A38 38 0 0 1 12.58 56.60",
  "M12.58 43.40 A38 38 0 0 1 43.40 12.58",
];

// Durée totale d'un battement double + silence, et décalage entre les deux ondes du
// battement. Doit rester cohérent avec --animate-splash-wave dans globals.css (même
// durée totale) et les keyTimes des <animate> de flou ci-dessous (mêmes fractions).
const WAVE_CYCLE_S = 3.2;
const WAVE_BEAT_GAP_S = 0.3;

export function Logo({
  className,
  waves,
}: {
  className?: string;
  /** Ondes qui s'échappent de l'anneau (sonar), l'anneau lui-même reste fixe. */
  waves?: boolean;
}) {
  // id préfixés par instance : le logo peut s'afficher deux fois en même temps (écran de
  // chargement au-dessus d'une page qui l'utilise déjà), et des id SVG dupliqués
  // casseraient les références url(#...) du deuxième exemplaire.
  const uid = useId();
  const gradId = `logoGoldGrad-${uid}`;
  const clipId = `logoOrbClip-${uid}`;
  const maskId = `logoRingGapMask-${uid}`;
  const blurId1 = `logoWaveBlur1-${uid}`;
  const blurId2 = `logoWaveBlur2-${uid}`;

  return (
    // overflow-visible : les ondes sonar grandissent au-delà du viewBox (100x100), sans
    // ça le SVG les rognerait net au bord au lieu de les laisser s'estomper dehors.
    <svg
      viewBox="0 0 100 100"
      className={`overflow-visible ${className ?? ""}`}
      aria-hidden="true"
    >
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
        {waves && (
          <>
            {/* Flou animé en SMIL (synchronisé sur les mêmes keyTimes que le scale CSS) :
                net près de l'anneau, de plus en plus diffus à mesure que l'onde s'éloigne.
                Une <animate> CSS de stdDeviation n'est pas supportée de façon fiable. */}
            <filter id={blurId1} x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="0.3">
                <animate
                  attributeName="stdDeviation"
                  values="0.3;5;5"
                  keyTimes="0;0.31;1"
                  dur={`${WAVE_CYCLE_S}s`}
                  begin="0s"
                  repeatCount="indefinite"
                />
              </feGaussianBlur>
            </filter>
            <filter id={blurId2} x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="0.3">
                <animate
                  attributeName="stdDeviation"
                  values="0.3;5;5"
                  keyTimes="0;0.31;1"
                  dur={`${WAVE_CYCLE_S}s`}
                  begin={`${WAVE_BEAT_GAP_S}s`}
                  repeatCount="indefinite"
                />
              </feGaussianBlur>
            </filter>
          </>
        )}
      </defs>

      {/* Ondes façon sonar émises depuis l'anneau, reprenant sa forme segmentée (pas un
          simple cercle) : 4 arcs aux mêmes positions que les vides du mask. Un double
          battement rapproché (0.3s d'écart) puis un silence avant que ça reparte, plutôt
          qu'un flux continu. Des <path> plutôt qu'un mask animé : un mask recalculé à
          chaque frame d'un scale se déforme dans Chromium (déjà rencontré sur la rotation
          de l'anneau). transform-box/-origin explicites : par défaut une forme SVG se
          scale depuis le coin de son viewport (pas son propre centre). */}
      {waves && (
        <>
          <g
            fill="none"
            stroke="#f2a93c"
            strokeWidth="4"
            filter={`url(#${blurId1})`}
            className="animate-splash-wave origin-center [transform-box:fill-box]"
          >
            {WAVE_ARCS.map((d) => (
              <path key={d} d={d} />
            ))}
          </g>
          <g
            fill="none"
            stroke="#f2a93c"
            strokeWidth="4"
            filter={`url(#${blurId2})`}
            className="animate-splash-wave origin-center [transform-box:fill-box]"
            style={{ animationDelay: `${WAVE_BEAT_GAP_S}s` }}
          >
            {WAVE_ARCS.map((d) => (
              <path key={d} d={d} />
            ))}
          </g>
        </>
      )}

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
    </svg>
  );
}
