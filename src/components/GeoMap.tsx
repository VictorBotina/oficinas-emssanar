"use client";

import React, { useEffect, useRef } from 'react';
import L, { Map as LeafletMap, Marker } from 'leaflet';
import type { Location, LocationInfo } from '@/types';
import { executeSupabaseQuery } from "@/lib/supabase-utils";

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
  <div style="font-family: 'PT Sans', sans-serif; font-size: 14px; line-height: 1.5;">
    <h3 style="font-weight: 700; font-size: 16px; margin: 0 0 8px; color: hsl(var(--card-foreground));">${data.municipio}, ${data.departamento}</h3>
    <p style="margin: 0 0 4px;"><strong style="color: hsl(var(--muted-foreground));">Dirección:</strong> ${data.direccion || 'No especificada'}</p>
    <p style="margin: 0 0 4px;"><strong style="color: hsl(var(--muted-foreground));">Horario:</strong> ${data.horario_atencion || 'No especificado'}</p>
    ${data.servicios_sub ? `<p style="margin: 0 0 4px;"><strong style="color: hsl(var(--muted-foreground));">Servicios Sub:</strong> ${data.servicios_sub}</p>` : ''}
    ${data.servicios_cont ? `<p style="margin: 0 0 4px;"><strong style="color: hsl(var(--muted-foreground));">Servicios Cont:</strong> ${data.servicios_cont}</p>` : ''}
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

    marker.setPopupContent("Cargando información...").openPopup();

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
        marker.setPopupContent(message);
      }
    } catch (e: any) {
      marker.setPopupContent(`Error al cargar: ${e.message || 'Error desconocido'}`);
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
        
        // Initial simple popup
        const initialPopupContent = `<b>${loc.nombre}</b><br>${loc.departamento}`;
        marker.bindPopup(initialPopupContent);
        
        marker.on('click', () => {
          // Notify the parent page to update filters
          onMarkerClick(loc.id_dane);
          // Handle the API call and update the popup
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