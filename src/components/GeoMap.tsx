"use client";

import React, { useEffect, useRef } from 'react';
import L, { Map as LeafletMap } from 'leaflet';
import type { Location, LocationInfo } from '@/types';

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

interface GeoMapProps {
  locations: Location[];
  center: [number, number];
  zoom: number;
  selectedLocationInfo?: LocationInfo | null;
  onMarkerClick?: (log: string) => void;
}

const createPopupContent = (info: LocationInfo) => `
  <div class="font-bold text-base mb-2">${info.municipio}, ${info.departamento}</div>
  <div class="text-sm">
    <p><strong>Address:</strong> ${info.direccion}</p>
    <p><strong>Hours:</strong> ${info.horario_atencion}</p>
    <p><strong>Subscription Services:</strong> ${info.servicios_sub}</p>
    <p><strong>Services:</strong> ${info.servicios_cont}</p>
  </div>
`;

const GeoMap = ({ locations, center, zoom, selectedLocationInfo, onMarkerClick }: GeoMapProps) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef<L.LayerGroup>(new L.LayerGroup());
  const popupRef = useRef<L.Popup | null>(null);

  useEffect(() => {
    if (mapContainerRef.current && !mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: center,
        zoom: zoom,
        scrollWheelZoom: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      mapInstanceRef.current = map;
      markersRef.current.addTo(map);
    }
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (map) {
      map.flyTo(center, zoom, {
        animate: true,
        duration: 1.5,
      });
    }
  }, [center, zoom]);

  useEffect(() => {
    const markers = markersRef.current;
    const map = mapInstanceRef.current;

    if (markers && map) {
      markers.clearLayers();
      locations.forEach(loc => {
        const marker = L.marker([loc.latitud, loc.longitud], { icon: defaultIcon });
        
        marker.on('click', () => {
          onMarkerClick?.(`Fetching details for id_dane: ${loc.id_dane}`);
          if (popupRef.current) {
            popupRef.current.remove();
          }

          const popup = L.popup({ minWidth: 250 });
          popupRef.current = popup;

          popup
            .setLatLng([loc.latitud, loc.longitud])
            .setContent(`<div class="font-bold">${loc.nombre}</div><p>Loading details...</p>`)
            .openOn(map);
          
          fetch(`/api/location-info?id=${loc.id_dane}`)
            .then(res => res.json())
            .then(result => {
              onMarkerClick?.(`API Response: ${JSON.stringify(result, null, 2)}`);
              if (result.error) {
                popup.setContent(`<div class="font-bold">${loc.nombre}</div><p>${result.error}</p>`);
              } else {
                popup.setContent(createPopupContent(result));
              }
            })
            .catch((err) => {
              const errorMessage = `Error fetching details: ${err.message}`;
              onMarkerClick?.(errorMessage);
              popup.setContent(`<div class="font-bold">${loc.nombre}</div><p>${errorMessage}</p>`);
            });
        });

        markers.addLayer(marker);
      });
    }
  }, [locations, onMarkerClick]);
  
  useEffect(() => {
    const cleanup = () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
    
    return cleanup;
  }, []);

  return <div ref={mapContainerRef} className="h-full w-full" />;
};

export default GeoMap;
