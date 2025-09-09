"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { MapIcon } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

import type { Location } from "@/types";

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

  React.useEffect(() => {
    fetch('/locations.json')
      .then(res => res.json())
      .then(data => {
        if (!Array.isArray(data) || data.some(item => !item.id_dane || !item.nombre || item.latitud === undefined || item.longitud === undefined)) {
          toast({
            variant: "destructive",
            title: "Invalid File",
            description: "The JSON file is not in the correct format.",
          });
          return;
        }
        setAllLocations(data);
        const depts = data.filter(loc => String(loc.id_dane).length === 2 || String(loc.id_dane).length === 1).sort((a, b) => a.nombre.localeCompare(b.nombre));
        setDepartments(depts);
      })
      .catch(() => {
        toast({
          variant: "destructive",
          title: "Failed to load data",
          description: "Could not load default location data.",
        });
      });
  }, [toast]);
  
  React.useEffect(() => {
    if (selectedDept && selectedDept !== ALL_DEPARTMENTS) {
      const munis = allLocations
        .filter(loc => String(loc.id_dane).length === 5 && String(loc.id_dane).startsWith(selectedDept))
        .sort((a, b) => a.nombre.localeCompare(b.nombre));
      setMunicipalities(munis);
    } else {
      setMunicipalities([]);
    }
    setSelectedMuni(ALL_MUNICIPALITIES);
  }, [selectedDept, allLocations]);

  const filteredLocations = React.useMemo(() => {
    if (selectedMuni !== ALL_MUNICIPALITIES) {
      return allLocations.filter(loc => loc.id_dane === selectedMuni);
    }
    if (selectedDept !== ALL_DEPARTMENTS) {
      return allLocations.filter(loc => String(loc.id_dane).length === 5 && String(loc.id_dane).startsWith(selectedDept));
    }
    return allLocations.filter(loc => String(loc.id_dane).length === 5);
  }, [selectedDept, selectedMuni, allLocations]);
  
  const { center, zoom } = React.useMemo(() => {
    if (selectedMuni !== ALL_MUNICIPALITIES) {
      const muni = allLocations.find(m => m.id_dane === selectedMuni);
      if (muni) return { center: [muni.latitud, muni.longitud] as [number, number], zoom: 12 };
    }
    if (selectedDept !== ALL_DEPARTMENTS) {
      const dept = departments.find(d => d.id_dane === selectedDept);
      if (dept) return { center: [dept.latitud, dept.longitud] as [number, number], zoom: 8 };
    }
    if (filteredLocations.length > 0) {
      const totalLat = filteredLocations.reduce((acc, loc) => acc + loc.latitud, 0);
      const totalLng = filteredLocations.reduce((acc, loc) => acc + loc.longitud, 0);
      return { center: [totalLat / filteredLocations.length, totalLng / filteredLocations.length] as [number, number], zoom: 7 };
    }
    return { center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM };
  }, [selectedDept, selectedMuni, departments, allLocations, filteredLocations]);
  
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
      <main className="flex-1 relative">
        <div className="absolute top-4 left-4 z-10 w-full max-w-[300px] lg:max-w-[350px]">
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
        </div>
        <div className="absolute inset-0 z-0">
           <GeoMap locations={filteredLocations} center={center} zoom={zoom} />
        </div>
      </main>
    </div>
  );
}
