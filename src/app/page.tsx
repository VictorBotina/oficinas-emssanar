"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { MapIcon, AlertCircle, Search as SearchIcon } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { executeSupabaseQuery } from "@/lib/supabase-utils";

import type { Location, LocationInfo } from "@/types";

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

// --- Sub-componentes para mostrar datos ---

const DataField = ({ label, value }: { label: string, value: string | number }) => (
  <div>
    <p className="text-sm text-muted-foreground">{label}</p>
    <p className="font-medium">{value || 'No especificado'}</p>
  </div>
);

const StructuredResponse = ({ data }: { data: LocationInfo }) => {
  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>Información Detallada</CardTitle>
        <CardDescription>{data.municipio}, {data.departamento}</CardDescription>
      </CardHeader>
      <CardContent className="p-4 grid gap-4">
        <DataField label="Dirección" value={data.direccion} />
        <DataField label="Horario de Atención" value={data.horario_atencion} />
         {data.servicios_sub && <DataField label="Servicios Sub" value={data.servicios_sub} />}
        {data.servicios_cont && <DataField label="Servicios Cont" value={data.servicios_cont} />}
      </CardContent>
    </Card>
  );
};

const ApiResponseDisplay = ({ error, response, isLoading }: { error: string | null, response: any, isLoading: boolean }) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-2/3" />
        </CardHeader>
        <CardContent className="space-y-3 pt-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/6" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!response) {
    return (
       <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 gap-2">
          <SearchIcon className="h-8 w-8 text-muted-foreground" />
          <p className="text-muted-foreground text-center">
            Selecciona un municipio para ver la información detallada.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (response.success === false) {
     return (
       <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>No se encontraron datos</AlertTitle>
        <AlertDescription>{response.message || 'La consulta fue exitosa pero no se encontró información para este municipio.'}</AlertDescription>
      </Alert>
    )
  }

  return <StructuredResponse data={response.data} />;
};


// --- Componente Principal ---

export default function Home() {
  const [locationData, setLocationData] = React.useState<LocationData>({});
  const [departments, setDepartments] = React.useState<string[]>([]);
  const [municipalities, setMunicipalities] = React.useState<Location[]>([]);
  
  const [selectedDept, setSelectedDept] = React.useState<string>(ALL_DEPARTMENTS);
  const [selectedMuni, setSelectedMuni] = React.useState<string>(ALL_MUNICIPALITIES);

  const [response, setResponse] = React.useState<any>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

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
  
  const handleExecuteRequest = React.useCallback(async (id_dane: string) => {
    if (!supabaseUrl || !supabaseApiKey) {
      setError("Error: Las variables de entorno de Supabase no están configuradas.");
      return;
    }
    
    setError(null);
    setResponse(null);
    setIsLoading(true);

    try {
      const data = await executeSupabaseQuery(
        { supabaseUrl, supabaseKey: supabaseApiKey },
        {
          method: "POST",
          path: "/rest/v1/rpc/of_emssanar",
          body: JSON.stringify({ id_dane: id_dane }),
        }
      );
      
      const result = Array.isArray(data) ? data[0] : data;
      setResponse(result);

    } catch (e: any) {
      setError(e.message || "Ocurrió un error al consultar la información.");
      setResponse(null);
    } finally {
      setIsLoading(false);
    }
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
    setResponse(null);
    setError(null);
  }, [selectedDept, locationData]);

  React.useEffect(() => {
    if (selectedMuni && selectedMuni !== ALL_MUNICIPALITIES) {
      handleExecuteRequest(selectedMuni);
    } else {
      setResponse(null);
      setError(null);
    }
  }, [selectedMuni, handleExecuteRequest]);

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

  return (
    <div className="flex flex-col h-screen bg-background text-foreground font-body">
      <header className="flex items-center justify-between p-4 border-b shrink-0 z-10 bg-background">
        <div className="flex items-center gap-2">
          <MapIcon className="h-8 w-8 text-accent" />
          <h1 className="text-2xl font-bold font-headline text-gray-800">GeoExplorer</h1>
        </div>
      </header>
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 p-4 overflow-hidden">
        <div className="lg:col-span-1 flex flex-col gap-4">
          <Card>
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
          
          <ApiResponseDisplay error={error} response={response} isLoading={isLoading} />

        </div>
        <div className="lg:col-span-2 relative min-h-[400px] lg:min-h-0">
          <div className="absolute inset-0 z-0 rounded-lg overflow-hidden">
            <GeoMap 
              locations={filteredLocations} 
              center={center} 
              zoom={zoom}
              onMarkerClick={handleMarkerClick}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
