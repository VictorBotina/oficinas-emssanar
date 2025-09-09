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
const DEFAULT_ZOOM = 6;

export default function Home() {
  const { toast } = useToast();
  const [allLocations, setAllLocations] = React.useState<Location[]>([]);
  const [departments, setDepartments] = React.useState<Location[]>([]);
  const [municipalities, setMunicipalities] = React.useState<Location[]>([]);
  
  const [selectedDept, setSelectedDept] = React.useState<string>(ALL_DEPARTMENTS);
  const [selectedMuni, setSelectedMuni] = React.useState<string>(ALL_MUNICIPALITIES);
  const [selectedLocationInfo, setSelectedLocationInfo] = React.useState<LocationInfo | null>(null);
  const [isLocationInfoLoading, setIsLocationInfoLoading] = React.useState(false);
  const [logs, setLogs] = React.useState<string[]>(['Debug console initialized. Waiting for interaction...']);

  const addLog = (log: string) => {
    setLogs(prevLogs => [log, ...prevLogs]);
  }

  React.useEffect(() => {
    addLog("Attempting to fetch initial location data from /locations.json");
    fetch('/locations.json')
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        if (!Array.isArray(data) || data.some(item => !item.id_dane || !item.nombre || item.latitud === undefined || item.longitud === undefined)) {
          addLog("Error: /locations.json file is not in the correct format.");
          toast({
            variant: "destructive",
            title: "Invalid File",
            description: "The JSON file is not in the correct format.",
          });
          return;
        }
        addLog("Successfully fetched and parsed /locations.json.");
        setAllLocations(data);
        const depts = data.filter(loc => String(loc.id_dane).length === 2 || String(loc.id_dane).length === 1).sort((a, b) => a.nombre.localeCompare(b.nombre));
        setDepartments(depts);
      })
      .catch((error) => {
        addLog(`Error fetching /locations.json: ${error.message}`);
        toast({
          variant: "destructive",
          title: "Failed to load data",
          description: "Could not load default location data.",
        });
      });
  }, [toast]);
  
  React.useEffect(() => {
    if (selectedDept && selectedDept !== ALL_DEPARTMENTS) {
      addLog(`Department selected: ${selectedDept}. Filtering municipalities.`);
      const munis = allLocations
        .filter(loc => String(loc.id_dane).length === 5 && String(loc.id_dane).startsWith(selectedDept))
        .sort((a, b) => a.nombre.localeCompare(b.nombre));
      setMunicipalities(munis);
    } else {
      setMunicipalities([]);
    }
    setSelectedMuni(ALL_MUNICIPALITIES);
    setSelectedLocationInfo(null);
  }, [selectedDept, allLocations]);

  React.useEffect(() => {
    if (selectedMuni && selectedMuni !== ALL_MUNICIPALITIES) {
      setIsLocationInfoLoading(true);
      addLog(`Municipality selected: ${selectedMuni}. Fetching details from /api/location-info...`);
      fetch(`/api/location-info?id=${selectedMuni}`)
        .then(res => {
          addLog(`API response status: ${res.status}`);
          addLog(`API response content-type: ${res.headers.get('Content-Type')}`);
          if (!res.ok) {
            throw new Error(`API returned status ${res.status}`);
          }
          return res.json();
        })
        .then(result => {
          addLog(`API response data: ${JSON.stringify(result, null, 2)}`);
          if (result.success) {
            addLog("API call successful. Updating location details.");
            setSelectedLocationInfo(result.data);
          } else {
            addLog(`API call failed: ${result.message}`);
            toast({
              variant: "destructive",
              title: "Error",
              description: result.message || "Could not load location details.",
            });
            setSelectedLocationInfo(null);
          }
        })
        .catch((error) => {
          addLog(`Fetch error: ${error.message}`);
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to fetch location details.",
          });
          setSelectedLocationInfo(null);
        })
        .finally(() => {
          setIsLocationInfoLoading(false);
        });
    } else {
      setSelectedLocationInfo(null);
      if (selectedMuni === ALL_MUNICIPALITIES) {
          addLog("Municipality selection cleared.");
      }
    }
  }, [selectedMuni, toast]);

  const filteredLocations = React.useMemo(() => {
    if (selectedMuni !== ALL_MUNICIPALITIES) {
      return allLocations.filter(loc => loc.id_dane === selectedMuni);
    }
    if (selectedDept !== ALL_DEPARTMENTS) {
      return allLocations.filter(loc => String(loc.id_dane).length === 5 && String(loc.id_dane).startsWith(selectedDept));
    }
    return allLocations.filter(loc => String(loc.id_dane).length === 5);
  }, [selectedDept, selectedMuni, allLocations]);
  
  const activeLocation = React.useMemo(() => {
    if (selectedMuni !== ALL_MUNICIPALITIES) {
      return allLocations.find(m => m.id_dane === selectedMuni);
    }
    if (selectedDept !== ALL_DEPARTMENTS) {
      return departments.find(d => d.id_dane === selectedDept);
    }
    return undefined;
  }, [selectedDept, selectedMuni, departments, allLocations]);

  const { center, zoom } = React.useMemo(() => {
    if (activeLocation) {
      const zoomLevel = selectedMuni !== ALL_MUNICIPALITIES ? 12 : 8;
      return { center: [activeLocation.latitud, activeLocation.longitud] as [number, number], zoom: zoomLevel };
    }
    return { center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM };
  }, [activeLocation, selectedMuni]);
  
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
                      <SelectItem key={dept.id_dane} value={String(dept.id_dane)}>{dept.nombre}</SelectItem>
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
