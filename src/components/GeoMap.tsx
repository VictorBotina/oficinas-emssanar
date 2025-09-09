"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { Location } from '@/types';
import React, { useEffect, useState } from 'react';

const markerHtml = (color: string) => `
  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="${color}" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0px 2px 2px rgba(0,0,0,0.5));">
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>
`;

const defaultIcon = new L.DivIcon({
  html: markerHtml('hsl(var(--accent))'),
  className: 'bg-transparent border-0',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32]
});

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function MapViewUpdater({ center, zoom }: { center: [number, number], zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, {
      animate: true,
      duration: 1.5,
    });
  }, [center, zoom, map]);
  return null;
}

interface GeoMapProps {
  locations: Location[];
  activeLocation: Location | null;
}

const GeoMap = ({ locations, activeLocation }: GeoMapProps) => {
  const [map, setMap] = useState<L.Map | null>(null);

  const defaultCenter: [number, number] = [4.7110, -74.0721];
  const defaultZoom = 6;
  
  let center = defaultCenter;
  let zoom = defaultZoom;

  if (activeLocation) {
    center = [activeLocation.latitud, activeLocation.longitud];
    zoom = String(activeLocation.id_dane).length === 5 ? 12 : 8;
  } else if (locations.length > 0) {
    const totalLat = locations.reduce((acc, loc) => acc + loc.latitud, 0);
    const totalLng = locations.reduce((acc, loc) => acc + loc.longitud, 0);
    center = [totalLat / locations.length, totalLng / locations.length];
    zoom = 7;
  }

  const displayMap = React.useMemo(
    () => (
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={true}
        className="h-full w-full"
        whenCreated={setMap}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {locations.map(loc => (
          <Marker key={loc.id_dane} position={[loc.latitud, loc.longitud]} icon={defaultIcon}>
            <Popup>
              <div className="font-bold">{loc.nombre}</div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return (
    <div>
      {displayMap}
      {map ? <MapViewUpdater center={center} zoom={zoom} /> : null}
    </div>
  );
};

export default React.memo(GeoMap);
