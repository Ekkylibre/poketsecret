"use client";

import { createContext, useContext, useState } from "react";

// Lyon, cohérent avec les données de démo, en attendant la vraie géoloc au chargement.
const DEFAULT_CENTER = { lat: 45.764, lng: 4.8357 };
const DEFAULT_RADIUS_KM = 10;

type LatLng = { lat: number; lng: number };

interface LocationContextValue {
  center: LatLng;
  setCenter: (center: LatLng) => void;
  radiusKm: number;
  setRadiusKm: (radiusKm: number) => void;
  /** Partagé plutôt que local à CarteExplorer : sans ça, revenir sur l'onglet carte après
   *  l'avoir quitté redéclencherait la géoloc et recentrerait la vue à chaque fois, même
   *  après que l'utilisateur ait volontairement navigué ailleurs sur la carte. Une seule
   *  tentative automatique par session, jamais relancée après la première. */
  hasAutoLocated: boolean;
  setHasAutoLocated: (value: boolean) => void;
}

const LocationContext = createContext<LocationContextValue | null>(null);

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [center, setCenter] = useState<LatLng>(DEFAULT_CENTER);
  const [radiusKm, setRadiusKm] = useState(DEFAULT_RADIUS_KM);
  const [hasAutoLocated, setHasAutoLocated] = useState(false);

  return (
    <LocationContext.Provider
      value={{ center, setCenter, radiusKm, setRadiusKm, hasAutoLocated, setHasAutoLocated }}
    >
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error("useLocation doit être utilisé dans un LocationProvider.");
  return ctx;
}
