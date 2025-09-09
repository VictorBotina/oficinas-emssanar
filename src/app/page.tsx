
"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { MapIcon } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import type { Location } from "@/types";

const GeoMap = dynamic(() => import("@/components/GeoMap"), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full" />,
});

const ALL_DEPARTMENTS = "__ALL_DEPARTMENTS__";
const ALL_MUNICIPALITIES = "__ALL_MUNICIPALITIES__";
const DEFAULT_CENTER: [number, number] = [4.7110, -74.0721];
const DEFAULT_ZOOM = 5;

type LocationData = {
  [department: string]: {
    nombre_municipio: string;
    id_dane: string;
    latitud: number;
    longitud: number;
  }[];
};

export default function Home() {
  const [locationData, setLocationData] = React.useState<LocationData>({});
  const [departments, setDepartments] = React.useState<string[]>([]);
  const [municipalities, setMunicipalities] = React.useState<Location[]>([]);
  
  const [selectedDept, setSelectedDept] = React.useState<string>(ALL_DEPARTMENTS);
  const [selectedMuni, setSelectedMuni] = React.useState<string>(ALL_MUNICIPALITIES);
  const [error, setError] = React.useState<string | null>(null);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseApiKey = process.env.NEXT_PUBLIC_SUPABASE_API_KEY;

  React.useEffect(() => {
    if (!supabaseUrl || !supabaseApiKey) {
      setError("Error: Las variables de entorno de Supabase (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_API_KEY) no están configuradas en el archivo .env. Asegúrate de que el archivo existe y reinicia el servidor.");
    }

    fetch('/locations.json')
      .then(res => {
        if (!res.ok) throw new Error(`Error HTTP: ${res.status}`);
        return res.json();
      })
      .then((data: LocationData) => {
        setLocationData(data);
        const deptNames = Object.keys(data).sort((a, b) => a.localeCompare(b));
        setDepartments(deptNames);
      })
      .catch(() => {
        setError("No se pudo cargar el archivo de ubicaciones (locations.json).");
      });
  }, [supabaseUrl, supabaseApiKey]);

  React.useEffect(() => {
    if (selectedDept && selectedDept !== ALL_DEPARTMENTS) {
      const munis = locationData[selectedDept]?.map(m => ({
        ...m,
        nombre: m.nombre_municipio
      })) || [];
      setMunicipalities(munis.sort((a, b) => a.nombre.localeCompare(b.nombre)));
    } else {
      setMunicipalities([]);
    }
    setSelectedMuni(ALL_MUNICIPALITIES);
  }, [selectedDept, locationData]);

  const allLocations = React.useMemo(() => {
    return Object.entries(locationData).flatMap(([dept, munis]) => 
      munis.map(muni => ({
        ...muni,
        nombre: muni.nombre_municipio,
        departamento: dept
      }))
    );
  }, [locationData]);

  const filteredLocations = React.useMemo(() => {
    if (selectedMuni !== ALL_MUNICIPALITIES) {
      return allLocations.filter(loc => loc.id_dane === selectedMuni);
    }
    if (selectedDept !== ALL_DEPARTMENTS) {
      return allLocations.filter(loc => loc.departamento === selectedDept);
    }
    return allLocations;
  }, [selectedDept, selectedMuni, allLocations]);
  
  const activeLocation = React.useMemo(() => {
    if (selectedMuni !== ALL_MUNICIPALITIES) {
      return allLocations.find(m => m.id_dane === selectedMuni);
    }
    return undefined;
  }, [selectedMuni, allLocations]);

  const { center, zoom } = React.useMemo(() => {
    if (activeLocation) {
      return { center: [activeLocation.latitud, activeLocation.longitud] as [number, number], zoom: 12 };
    }
    if (selectedDept !== ALL_DEPARTMENTS && filteredLocations.length > 0) {
      const avgLat = filteredLocations.reduce((acc, loc) => acc + loc.latitud, 0) / filteredLocations.length;
      const avgLng = filteredLocations.reduce((acc, loc) => acc + loc.longitud, 0) / filteredLocations.length;
      return { center: [avgLat, avgLng] as [number, number], zoom: 8 };
    }
    return { center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM };
  }, [activeLocation, selectedDept, filteredLocations]);
  
  const handleDeptChange = (value: string) => {
    setSelectedDept(value);
  }

  const handleMuniChange = (value: string) => {
    setSelectedMuni(value);
  }

  const handleMarkerClick = (id_dane: string) => {
    const location = allLocations.find(loc => loc.id_dane === id_dane);
    if (location) {
      setSelectedDept(location.departamento || ALL_DEPARTMENTS);
      // Timeout to allow municipalities to populate before setting the selected one
      setTimeout(() => {
        setSelectedMuni(id_dane);
      }, 0);
    }
  }

  if (error) {
     return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Alert variant="destructive" className="max-w-lg">
          <AlertTitle>Error de Configuración</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background text-foreground font-body">
      <header className="flex items-center justify-between p-4 border-b shrink-0 z-20 bg-background/80 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <MapIcon className="h-8 w-8 text-accent" />
          <h1 className="text-2xl font-bold font-headline text-gray-800">GeoExplorer</h1>
        </div>
      </header>
      <main className="flex-1 relative">
        <div className="absolute inset-0 z-0">
          <GeoMap 
            locations={filteredLocations} 
            center={center} 
            zoom={zoom}
            onMarkerClick={handleMarkerClick}
          />
        </div>
        <div className="absolute top-4 left-4 z-10 w-full max-w-sm lg:max-w-md">
          <Card className="bg-background/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Filtros</CardTitle>
              <CardDescription>Selecciona un departamento y municipio para ver en el mapa.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="department-select">Departamento</Label>
                <Select value={selectedDept} onValueChange={handleDeptChange}>
                  <SelectTrigger id="department-select">
                    <SelectValue placeholder="Selecciona un departamento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_DEPARTMENTS}>Todos los Departamentos</SelectItem>
                    {departments.map(dept => (
                      <SelectItem key={dept} value={dept} className="capitalize">{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="municipality-select">Municipio</Label>
                <Select value={selectedMuni} onValueChange={handleMuniChange} disabled={selectedDept === ALL_DEPARTMENTS}>
                  <SelectTrigger id="municipality-select">
                    <SelectValue placeholder="Selecciona un municipio" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_MUNICIPALITIES}>Todos los Municipios</SelectItem>
                    {municipalities.map(muni => (
                      <SelectItem key={muni.id_dane} value={muni.id_dane}>{muni.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
