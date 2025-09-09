"use client";

import React, { useEffect, useRef, useState } from 'react';
import L, { Map as LeafletMap } from 'leaflet';
import type { Location } from '@/types';

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


interface MapUpdaterProps {
  map: LeafletMap;
  locations: Location[];
  center: [number, number];
  zoom: number;
}

function MapUpdater({ map, locations, center, zoom }: MapUpdaterProps) {
  const markersRef = useRef<L.LayerGroup>(new L.LayerGroup());

  useEffect(() => {
    if (map) {
      map.flyTo(center, zoom, {
        animate: true,
        duration: 1.5,
      });
    }
  }, [center, zoom, map]);

  useEffect(() => {
    if (map) {
      markersRef.current.clearLayers();
      locations.forEach(loc => {
        const marker = L.marker([loc.latitud, loc.longitud], { icon: defaultIcon });
        marker.bindPopup(`<div class="font-bold">${loc.nombre}</div>`);
        markersRef.current.addLayer(marker);
      });
      markersRef.current.addTo(map);
    }
  }, [locations, map]);

  return null;
}


interface GeoMapProps {
  locations: Location[];
  center: [number, number];
  zoom: number;
}

const GeoMap = ({ locations, center, zoom }: GeoMapProps) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<LeafletMap | null>(null);

  useEffect(() => {
    if (mapContainerRef.current && !map) {
      const leafletMap = L.map(mapContainerRef.current, {
        center: center,
        zoom: zoom,
        scrollWheelZoom: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(leafletMap);
      
      setMap(leafletMap);
    }
  }, [mapContainerRef, map, center, zoom]);

  useEffect(() => {
    return () => {
      if (map) {
        map.remove();
      }
    };
  }, [map]);
  

  return (
    <div ref={mapContainerRef} className="h-full w-full">
      {map && <MapUpdater map={map} locations={locations} center={center} zoom={zoom} />}
    </div>
  );
};

export default GeoMap;
