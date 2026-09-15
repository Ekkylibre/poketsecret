"use client";

import { MapPin } from "lucide-react";
import { useState } from "react";
import { Map, Marker } from "react-map-gl/mapbox";

import { useLocation } from "@/components/location-provider";

import "mapbox-gl/dist/mapbox-gl.css";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

/** Alternative à la sélection d'une suggestion d'adresse (voir nouveau-magasin-dialog.tsx) :
 *  certaines adresses réelles (numéro absent, rue trop récente pour être dans la Base
 *  Adresse Nationale) ne remontent jamais de suggestion malgré un vrai magasin existant à
 *  cet endroit. Cliquer sur la carte fixe directement lat/lng, indépendamment de cette API. */
export function StoreLocationPicker({
  coords,
  onPick,
}: {
  coords: { lat: number; lng: number } | null;
  onPick: (coords: { lat: number; lng: number }) => void;
}) {
  const { center } = useLocation();
  const start = coords ?? center;
  const [viewState, setViewState] = useState({
    latitude: start.lat,
    longitude: start.lng,
    zoom: coords ? 15 : 12,
  });

  if (!MAPBOX_TOKEN) {
    return (
      <p className="text-muted-foreground rounded-md border p-3 text-xs">
        Carte indisponible (token Mapbox manquant).
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      {/* Proportionnel à la hauteur d'écran (plus confortable qu'une taille fixe trop
          petite pour viser précisément un point), borné pour ne pas dépasser le
          max-h-[90vh] du dialogue (voir components/ui/dialog.tsx) une fois header, champs
          et pied de page ajoutés — le dialogue reste scrollable dans le pire des cas. */}
      <div className="relative h-[45vh] max-h-96 min-h-64 overflow-hidden rounded-md border">
        <Map
          {...viewState}
          onMove={(evt) => setViewState(evt.viewState)}
          onClick={(e) => onPick({ lat: e.lngLat.lat, lng: e.lngLat.lng })}
          mapboxAccessToken={MAPBOX_TOKEN}
          mapStyle="mapbox://styles/mapbox/streets-v12"
          style={{ width: "100%", height: "100%" }}
        >
          {coords && (
            <Marker latitude={coords.lat} longitude={coords.lng} anchor="bottom">
              <MapPin className="fill-primary text-background size-7 drop-shadow [&_circle]:fill-transparent" />
            </Marker>
          )}
        </Map>
      </div>
      <p className="text-muted-foreground text-center text-xs">
        {coords ? "Touche la carte pour ajuster." : "Touche la carte à l'emplacement du magasin."}
      </p>
    </div>
  );
}
