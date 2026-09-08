"use client";

import { Crosshair, MapPin, Phone, Ruler, Search, Store as StoreIcon } from "lucide-react";
import mapboxgl from "mapbox-gl";
import { type FormEvent, useMemo, useState } from "react";
import { Layer, Map, Marker, Popup, Source } from "react-map-gl/mapbox";

import { useLocation } from "@/components/location-provider";
import { NouveauMagasinDialog } from "@/components/nouveau-magasin-dialog";
import { StoreInfoPanel } from "@/components/store-info-panel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import type { Store } from "@/lib/types";
import { formatStoreAddress } from "@/lib/utils";

import "mapbox-gl/dist/mapbox-gl.css";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function circleCoordinates(centerLat: number, centerLng: number, radiusKm: number) {
  const points = 64;
  const kmPerLat = 111.32;
  const kmPerLng = 111.32 * Math.cos((centerLat * Math.PI) / 180);
  const coords: [number, number][] = [];
  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * 2 * Math.PI;
    coords.push([
      centerLng + (radiusKm / kmPerLng) * Math.sin(angle),
      centerLat + (radiusKm / kmPerLat) * Math.cos(angle),
    ]);
  }
  return coords;
}

export function CarteExplorer({ stores }: { stores: Store[] }) {
  const { center, setCenter, radiusKm, setRadiusKm } = useLocation();
  const [viewState, setViewState] = useState({
    latitude: center.lat,
    longitude: center.lng,
    zoom: 11,
  });
  const [storeQuery, setStoreQuery] = useState("");
  const [addressQuery, setAddressQuery] = useState("");
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  // Id plutôt que l'objet Store entier : après édition/signalement (revalidatePath),
  // `stores` est rafraîchi et on veut que la fiche affiche la version à jour, pas une
  // copie figée au moment de l'ouverture.
  const [detailStoreId, setDetailStoreId] = useState<string | null>(null);
  const detailStore = detailStoreId ? (stores.find((s) => s.id === detailStoreId) ?? null) : null;
  const [pinnedLocation, setPinnedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const [storeSearchError, setStoreSearchError] = useState<string | null>(null);
  const [addressSearchError, setAddressSearchError] = useState<string | null>(null);

  const circle = useMemo(
    () => ({
      type: "Feature" as const,
      properties: {},
      geometry: {
        type: "Polygon" as const,
        coordinates: [circleCoordinates(center.lat, center.lng, radiusKm)],
      },
    }),
    [center, radiusKm]
  );

  const storesInRadius = useMemo(
    () =>
      stores.filter(
        (s) =>
          (s.lat !== 0 || s.lng !== 0) &&
          distanceKm(center, { lat: s.lat, lng: s.lng }) <= radiusKm
      ),
    [stores, center, radiusKm]
  );

  function setSearchCenter(lat: number, lng: number) {
    setCenter({ lat, lng });
    setPinnedLocation({ lat, lng });
  }

  function flyTo(lat: number, lng: number, zoom = 13) {
    setViewState((v) => ({ ...v, latitude: lat, longitude: lng, zoom }));
    setSearchCenter(lat, lng);
  }

  function handleLocateMe() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => flyTo(pos.coords.latitude, pos.coords.longitude),
      () => setAddressSearchError("Impossible de récupérer ta position.")
    );
  }

  function handleStoreSearch(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStoreSearchError(null);
    const query = storeQuery.trim();
    if (!query) return;

    const matchedStore = stores.find((s) => s.name.toLowerCase().includes(query.toLowerCase()));
    if (matchedStore) {
      flyTo(matchedStore.lat, matchedStore.lng);
      setSelectedStore(matchedStore);
    } else {
      setStoreSearchError("Aucun magasin trouvé pour cette recherche.");
    }
  }

  async function handleAddressSearch(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAddressSearchError(null);
    const query = addressQuery.trim();
    if (!query || !MAPBOX_TOKEN) return;

    setIsSearchingAddress(true);
    try {
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&country=fr&limit=1`
      );
      const data = await res.json();
      const feature = data.features?.[0];
      if (feature) {
        const [lng, lat] = feature.center as [number, number];
        flyTo(lat, lng);
      } else {
        setAddressSearchError("Aucun résultat pour cette adresse.");
      }
    } catch {
      setAddressSearchError("Erreur de recherche, réessaie.");
    } finally {
      setIsSearchingAddress(false);
    }
  }

  function handleMapClick(e: { lngLat: { lat: number; lng: number } }) {
    const { lat, lng } = e.lngLat;
    setSearchCenter(lat, lng);
  }

  // La lib react-map-gl ne supprime pas toujours le contrôle d'attribution par
  // défaut : on le retire nous-mêmes et on le remplace par une version compacte,
  // via l'API mapbox-gl native plutôt que de dépendre de ce comportement incertain.
  function handleMapLoad(e: { target: mapboxgl.Map }) {
    const map = e.target;
    const controls = (map as unknown as { _controls: unknown[] })._controls;
    for (const control of controls) {
      if (control instanceof mapboxgl.AttributionControl) {
        map.removeControl(control);
      }
    }
    map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-right");
  }

  if (!MAPBOX_TOKEN) {
    return (
      <div className="bg-muted text-muted-foreground m-4 flex h-40 items-center justify-center rounded-2xl text-sm">
        <MapPin className="mr-1.5 size-4" />
        Carte indisponible (token Mapbox manquant).
      </div>
    );
  }

  return (
    <div className="flex h-full flex-1 flex-col gap-4 overflow-hidden p-4">
      <div className="relative min-h-48 flex-1 overflow-hidden rounded-2xl">
        <Map
          {...viewState}
          onMove={(evt) => setViewState(evt.viewState)}
          onClick={handleMapClick}
          onLoad={handleMapLoad}
          mapboxAccessToken={MAPBOX_TOKEN}
          mapStyle="mapbox://styles/mapbox/streets-v12"
          style={{ width: "100%", height: "100%" }}
        >
          <Source id="radius" type="geojson" data={circle}>
            <Layer
              id="radius-fill"
              type="fill"
              paint={{ "fill-color": "#007cbf", "fill-opacity": 0.1 }}
            />
          </Source>

          {pinnedLocation && (
            <Marker
              latitude={pinnedLocation.lat}
              longitude={pinnedLocation.lng}
              anchor="bottom"
              offset={[0, 3]}
            >
              <MapPin className="fill-primary text-background size-7 drop-shadow [&_circle]:fill-transparent" />
            </Marker>
          )}

          {storesInRadius.map((s) => (
            <Marker
              key={s.id}
              latitude={s.lat}
              longitude={s.lng}
              anchor="bottom"
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                setSelectedStore(s);
              }}
            >
              <div className="bg-primary text-primary-foreground border-background flex size-7 cursor-pointer items-center justify-center rounded-full border-2 shadow">
                <StoreIcon className="size-3.5" />
              </div>
            </Marker>
          ))}

          {selectedStore && (
            <Popup
              latitude={selectedStore.lat}
              longitude={selectedStore.lng}
              anchor="top"
              onClose={() => setSelectedStore(null)}
              closeOnClick={false}
            >
              <div className="flex flex-col gap-1">
                <p className="text-foreground pr-2 text-sm font-semibold">{selectedStore.name}</p>
                <p className="text-muted-foreground text-xs">{formatStoreAddress(selectedStore)}</p>
                {selectedStore.phone && (
                  <p className="text-muted-foreground flex items-center gap-1 text-xs">
                    <Phone className="size-3" />
                    {selectedStore.phone}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setDetailStoreId(selectedStore.id);
                    setSelectedStore(null);
                  }}
                  className="text-foreground text-left text-xs font-medium underline underline-offset-2"
                >
                  Voir la fiche
                </button>
              </div>
            </Popup>
          )}
        </Map>
      </div>

      <div className="flex min-h-80 gap-3">
        {detailStore && (
          <StoreInfoPanel
            store={detailStore}
            onClose={() => setDetailStoreId(null)}
            className="min-w-0 flex-1 basis-0"
          />
        )}

        <Card className="min-w-0 flex-1 basis-0 gap-3 p-4">
          <form onSubmit={handleStoreSearch} className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              value={storeQuery}
              onChange={(e) => setStoreQuery(e.target.value)}
              type="search"
              placeholder="Rechercher un magasin..."
              className="pl-9"
            />
          </form>
          {storeSearchError && <p className="text-destructive text-xs">{storeSearchError}</p>}

          <form onSubmit={handleAddressSearch} className="relative">
            <MapPin className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              value={addressQuery}
              onChange={(e) => setAddressQuery(e.target.value)}
              type="search"
              placeholder="Entrer une adresse..."
              className="pl-9"
              disabled={isSearchingAddress}
            />
          </form>
          {addressSearchError && <p className="text-destructive text-xs">{addressSearchError}</p>}

          <div className="bg-background flex flex-col gap-1.5 rounded-md border p-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-sm font-medium">
                <Ruler className="size-4" />
                Rayon de recherche
              </span>
              <span className="text-sm font-semibold">{radiusKm} km</span>
            </div>
            <Slider
              value={[radiusKm]}
              onValueChange={([v]) => setRadiusKm(v)}
              min={1}
              max={50}
              step={1}
            />
            <span className="text-muted-foreground text-center text-xs">
              Zoom {viewState.zoom.toFixed(1)} · Rayon maximum : 50 km
            </span>
          </div>

          <div className="mt-auto flex flex-col gap-2">
            <Button type="button" variant="outline" onClick={handleLocateMe}>
              <Crosshair className="size-4" />
              Me localiser
            </Button>
            <NouveauMagasinDialog />
          </div>
        </Card>
      </div>
    </div>
  );
}
