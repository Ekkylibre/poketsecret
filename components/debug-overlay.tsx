"use client";

// Panneau de debug temporaire (cf. lib/debug-log.ts) : affiche en direct les logs pour
// diagnostiquer le bug de prise de photo sur mobile, sans avoir besoin d'un débogueur
// distant. À supprimer une fois le bug identifié/corrigé.
import { useEffect, useState } from "react";

import { clearDebugLog, readDebugLog } from "@/lib/debug-log";

export function DebugOverlay() {
  const [lines, setLines] = useState<string[]>([]);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => setLines(readDebugLog()), 200);
    return () => clearInterval(interval);
  }, []);

  if (lines.length === 0) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[999] max-h-[40vh] overflow-y-auto bg-black/90 p-2 font-mono text-[10px] text-lime-400"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.5rem)" }}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-white">Debug photo ({lines.length})</span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              clearDebugLog();
              setLines([]);
            }}
            className="rounded bg-white/20 px-2 py-0.5 text-white"
          >
            Effacer
          </button>
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="rounded bg-white/20 px-2 py-0.5 text-white"
          >
            {visible ? "Cacher" : "Montrer"}
          </button>
        </div>
      </div>
      {visible &&
        lines.map((line, i) => (
          <div key={i} className="whitespace-pre-wrap">
            {line}
          </div>
        ))}
    </div>
  );
}
