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
}

const LocationContext = createContext<LocationContextValue | null>(null);

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [center, setCenter] = useState<LatLng>(DEFAULT_CENTER);
  const [radiusKm, setRadiusKm] = useState(DEFAULT_RADIUS_KM);

  return (
    <LocationContext.Provider value={{ center, setCenter, radiusKm, setRadiusKm }}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error("useLocation doit être utilisé dans un LocationProvider.");
  return ctx;
}
