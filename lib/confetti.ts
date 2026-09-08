export const CONFETTI_COLORS = ["#facc15", "#38bdf8", "#34d399", "#f472b6", "#a78bfa"];

export interface ConfettiPiece {
  left: number;
  color: string;
  delay: number;
  duration: number;
  drift: number;
  rotation: number;
}

export function makeConfetti(count: number): ConfettiPiece[] {
  return Array.from({ length: count }, () => ({
    left: Math.random() * 100,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    delay: Math.random() * 0.3,
    duration: 1.1 + Math.random() * 0.8,
    drift: (Math.random() - 0.5) * 60,
    rotation: 360 + Math.random() * 360,
  }));
}
