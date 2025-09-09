"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { MapIcon } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import LocationDetails from "@/components/LocationDetails";
import DebugConsole from "@/components/DebugConsole";

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

export default function Home() {
  const { toast } = useToast();
  const [locationData, setLocationData] = React.useState<LocationData>({});
  const [departments, setDepartments] = React.useState<string[]>([]);
  const [municipalities, setMunicipalities] = React.useState<Location[]>([]);
  
  const [selectedDept, setSelectedDept] = React.useState<string>(ALL_DEPARTMENTS);
  const [selectedMuni, setSelectedMuni] = React.useState<string>(ALL_MUNICIPALITIES);
  const [selectedLocationInfo, setSelectedLocationInfo] = React.useState<LocationInfo | null>(null);
  const [isLocationInfoLoading, setIsLocationInfoLoading] = React.useState(false);
  const [logs, setLogs] = React.useState<string[]>(['Debug console initialized.']);

  const addLog = (log: string) => {
    setLogs(prevLogs => [`[${new Date().toLocaleTimeString()}] ${log}`, ...prevLogs]);
  }

  React.useEffect(() => {
    fetch('/locations.json')
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data: LocationData) => {
        setLocationData(data);
        const deptNames = Object.keys(data).sort((a, b) => a.localeCompare(b));
        setDepartments(deptNames);
      })
      .catch((error) => {
        toast({
          variant: "destructive",
          title: "Failed to load data",
          description: "Could not load location data.",
        });
      });
  }, [toast]);
  
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
    setSelectedLocationInfo(null);
  }, [selectedDept, locationData]);

  React.useEffect(() => {
    if (!selectedMuni || selectedMuni === ALL_MUNICIPALITIES) {
      setSelectedLocationInfo(null);
      return;
    }

    const fetchLocationInfo = async () => {
      setIsLocationInfoLoading(true);
      setSelectedLocationInfo(null);
      addLog(`POST to Supabase with id_dane: ${selectedMuni}`);

      try {
        const response = await fetch(`/api/location-info?id=${selectedMuni}`);
        const result = await response.json();
        
        addLog(`API Response: ${JSON.stringify(result, null, 2)}`);

        if (response.ok && !result.error) {
          setSelectedLocationInfo(result);
        } else {
          throw new Error(result.error || `HTTP error! status: ${response.status}`);
        }
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message || "Failed to fetch location details.",
        });
        setSelectedLocationInfo(null);
      } finally {
        setIsLocationInfoLoading(false);
      }
    };
    
    fetchLocationInfo();
  }, [selectedMuni, toast]);

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
      // Average the coordinates of the department's municipalities to center the map
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

  return (
    <div className="flex flex-col h-screen bg-background text-foreground font-body">
      <header className="flex items-center justify-between p-4 border-b shrink-0 z-10 bg-background">
        <div className="flex items-center gap-2">
          <MapIcon className="h-8 w-8 text-accent" />
          <h1 className="text-2xl font-bold font-headline text-gray-800">GeoExplorer</h1>
        </div>
      </header>
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 p-4">
        <div className="lg:col-span-1 flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Filters</CardTitle>
              <CardDescription>Select a department and municipality to view on the map.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="department-select">Department</Label>
                <Select value={selectedDept} onValueChange={handleDeptChange}>
                  <SelectTrigger id="department-select">
                    <SelectValue placeholder="Select a department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_DEPARTMENTS}>All Departments</SelectItem>
                    {departments.map(dept => (
                      <SelectItem key={dept} value={dept} className="capitalize">{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="municipality-select">Municipality</Label>
                <Select value={selectedMuni} onValueChange={handleMuniChange} disabled={selectedDept === ALL_DEPARTMENTS}>
                  <SelectTrigger id="municipality-select">
                    <SelectValue placeholder="Select a municipality" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_MUNICIPALITIES}>All Municipalities</SelectItem>
                    {municipalities.map(muni => (
                      <SelectItem key={muni.id_dane} value={muni.id_dane}>{muni.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
          <LocationDetails info={selectedLocationInfo} isLoading={isLocationInfoLoading} />
          <DebugConsole logs={logs} />
        </div>
        <div className="lg:col-span-2 relative min-h-[400px] lg:min-h-0">
          <div className="absolute inset-0 z-0 rounded-lg overflow-hidden">
            <GeoMap locations={filteredLocations} center={center} zoom={zoom} selectedLocationInfo={selectedLocationInfo} onMarkerClick={addLog} />
          </div>
        </div>
      </main>
    </div>
  );
}
