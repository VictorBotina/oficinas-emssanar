"use client";

import React, { useEffect, useRef } from 'react';
import L, { Map as LeafletMap, Marker } from 'leaflet';
import type { Location, LocationInfo } from '@/types';
import { executeSupabaseQuery } from "@/lib/supabase-utils";
import { MapPin, Clock } from 'lucide-react';

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


const PopupContent = ({ data }: { data: LocationInfo }) => `
  <div class="p-1.5 max-w-sm font-sans" style="font-family: 'PT Sans', sans-serif;">
    <div class="rounded-lg bg-card text-card-foreground">
      <div class="p-4 border-b flex items-center gap-4">
        <img src="https://emssanareps.co/images/logo_emssanareps.svg" alt="Logo Emssanar" class="h-10 w-auto" />
        <h3 class="text-xl font-bold text-gray-800">${data.municipio}, ${data.departamento}</h3>
      </div>
      <div class="p-4 space-y-3 text-base">
        <div class="flex items-start gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-6 w-6 text-gray-500 flex-shrink-0"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path><circle cx="12" cy="10" r="3"></circle></svg>
          <div class="flex-1">
            <p class="font-semibold text-gray-700">Dirección</p>
            <p class="text-gray-600">${data.direccion || 'No especificada'}</p>
          </div>
        </div>
        <div class="flex items-start gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-6 w-6 text-gray-500 flex-shrink-0"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
          <div class="flex-1">
            <p class="font-semibold text-gray-700">Horario</p>
            <p class="text-gray-600">${data.horario_atencion || 'No especificado'}</p>
          </div>
        </div>
        
        <details class="group">
          <summary class="flex items-center justify-between cursor-pointer list-none font-semibold text-gray-700">
            Servicios Subsidiados
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5 transition-transform group-open:rotate-180"><path d="m6 9 6 6 6-6"></path></svg>
          </summary>
          <p class="mt-2 text-gray-600">${data.servicios_sub || 'No disponibles'}</p>
        </details>
        
        <details class="group">
          <summary class="flex items-center justify-between cursor-pointer list-none font-semibold text-gray-700">
            Servicios Contributivos
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5 transition-transform group-open:rotate-180"><path d="m6 9 6 6 6-6"></path></svg>
          </summary>
          <p class="mt-2 text-gray-600">${data.servicios_cont || 'No disponibles'}</p>
        </details>

      </div>
    </div>
  </div>
`;

interface GeoMapProps {
  locations: Location[];
  center: [number, number];
  zoom: number;
  onMarkerClick: (id_dane: string) => void;
}

const GeoMap = ({ locations, center, zoom, onMarkerClick }: GeoMapProps) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef<L.LayerGroup>(new L.LayerGroup());

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_API_KEY;

  const handleMarkerApiCall = async (id_dane: string, marker: Marker) => {
    if (!supabaseUrl || !supabaseKey) {
      marker.setPopupContent("Error: Faltan las credenciales de Supabase.").openPopup();
      return;
    }

    marker.setPopupContent('<div class="p-4 font-sans">Cargando información...</div>').openPopup();

    try {
      const data = await executeSupabaseQuery(
        { supabaseUrl, supabaseKey: supabaseKey },
        {
          method: "POST",
          path: "/rest/v1/rpc/of_emssanar",
          body: JSON.stringify({ id_dane: id_dane }),
        }
      );
      
      const result = Array.isArray(data) ? data[0] : data;

      if (result && result.success && result.data) {
        marker.setPopupContent(PopupContent({ data: result.data }));
      } else {
        const message = result?.message || 'No se encontró información para esta ubicación.';
        marker.setPopupContent(`<div class="p-4 font-sans">${message}</div>`);
      }
    } catch (e: any) {
      marker.setPopupContent(`<div class="p-4 font-sans">Error al cargar: ${e.message || 'Error desconocido'}</div>`);
    }
  };


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
        
        const initialPopupContent = `<b>${loc.nombre}</b>`;
        marker.bindPopup(initialPopupContent);
        
        marker.on('click', () => {
          onMarkerClick(loc.id_dane);
          handleMarkerApiCall(loc.id_dane, marker);
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
