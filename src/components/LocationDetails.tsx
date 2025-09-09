"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { LocationInfo } from "@/types";

interface LocationDetailsProps {
  info: LocationInfo | null;
  isLoading: boolean;
}

export default function LocationDetails({ info, isLoading }: LocationDetailsProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-2/3" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/6" />
        </CardContent>
      </Card>
    );
  }

  if (!info) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{info.municipio}, {info.departamento}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p><strong>Address:</strong> {info.direccion}</p>
        <p><strong>Hours:</strong> {info.horario_atencion}</p>
        <p><strong>Subscription Services:</strong> {info.servicios_sub}</p>
        <p><strong>Services:</strong> {info.servicios_cont}</p>
      </CardContent>
    </Card>
  );
}
