"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { Upload, Map as MapIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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

export default function Home() {
  const { toast } = useToast();
  const [allLocations, setAllLocations] = React.useState<Location[]>([]);
  const [departments, setDepartments] = React.useState<Location[]>([]);
  const [municipalities, setMunicipalities] = React.useState<Location[]>([]);
  
  const [selectedDept, setSelectedDept] = React.useState<string>(ALL_DEPARTMENTS);
  const [selectedMuni, setSelectedMuni] = React.useState<string>(ALL_MUNICIPALITIES);

  const processLocations = React.useCallback((data: Location[]) => {
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
    setSelectedDept(ALL_DEPARTMENTS);
    setSelectedMuni(ALL_MUNICIPALITIES);
  }, [toast]);

  React.useEffect(() => {
    fetch('/locations.json')
      .then(res => res.json())
      .then(data => {
        processLocations(data);
      })
      .catch(() => {
        toast({
          variant: "destructive",
          title: "Failed to load data",
          description: "Could not load default location data.",
        });
      });
  }, [processLocations, toast]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result;
          if (typeof content === 'string') {
            const jsonData = JSON.parse(content);
            processLocations(jsonData);
            toast({
              title: "Success",
              description: "Location data loaded from file.",
            });
          }
        } catch (error) {
          toast({
            variant: "destructive",
            title: "Error reading file",
            description: "Could not parse the JSON file. Please check its format.",
          });
        }
      };
      reader.readAsText(file);
    }
  };
  
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
    if (selectedMuni && selectedMuni !== ALL_MUNICIPALITIES) {
      return allLocations.filter(loc => loc.id_dane === selectedMuni);
    }
    if (selectedDept && selectedDept !== ALL_DEPARTMENTS) {
      return allLocations.filter(loc => String(loc.id_dane).length === 5 && String(loc.id_dane).startsWith(selectedDept));
    }
    return allLocations.filter(loc => String(loc.id_dane).length === 5);
  }, [selectedDept, selectedMuni, allLocations]);
  
  const activeLocation = React.useMemo(() => {
      if (selectedMuni && selectedMuni !== ALL_MUNICIPALITIES) return allLocations.find(m => m.id_dane === selectedMuni);
      if (selectedDept && selectedDept !== ALL_DEPARTMENTS) return departments.find(d => d.id_dane === selectedDept);
      return null;
  }, [selectedDept, selectedMuni, departments, allLocations]);
  
  const handleDeptChange = (value: string) => {
    setSelectedDept(value);
  }

  const handleMuniChange = (value: string) => {
    setSelectedMuni(value);
  }

  return (
    <div className="flex flex-col h-screen bg-background text-foreground font-body">
      <header className="flex items-center justify-between p-4 border-b shrink-0">
        <div className="flex items-center gap-2">
          <MapIcon className="h-8 w-8 text-accent" />
          <h1 className="text-2xl font-bold font-headline text-gray-800">GeoExplorer</h1>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="json-upload" className="cursor-pointer">
            <Button asChild variant="outline">
              <div>
                <Upload className="mr-2 h-4 w-4" /> Upload JSON
              </div>
            </Button>
          </Label>
          <Input id="json-upload" type="file" accept=".json" className="hidden" onChange={handleFileChange} />
        </div>
      </header>
      <main className="flex-1 grid grid-cols-1 md:grid-cols-[300px_1fr] lg:grid-cols-[350px_1fr] gap-4 p-4 overflow-hidden">
        <div className="flex flex-col gap-4 h-full overflow-y-auto">
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
        <div className="rounded-lg overflow-hidden shadow-lg border h-full">
           <GeoMap locations={filteredLocations} activeLocation={activeLocation} />
        </div>
      </main>
    </div>
  );
}
