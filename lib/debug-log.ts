// Diagnostic temporaire pour traquer un bug de prise de photo sur mobile (cf.
// components/debug-overlay.tsx). À supprimer une fois le bug identifié/corrigé.
const KEY = "photo-debug-log";
const MAX_LINES = 30;

export function debugLog(message: string) {
  try {
    const existing: string[] = JSON.parse(sessionStorage.getItem(KEY) ?? "[]");
    const time = new Date().toISOString().slice(11, 23);
    existing.push(`${time} ${message}`);
    sessionStorage.setItem(KEY, JSON.stringify(existing.slice(-MAX_LINES)));
  } catch {
    // sessionStorage indisponible (mode privé, etc.) : pas critique pour un outil de debug.
  }
}

export function readDebugLog(): string[] {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function clearDebugLog() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
