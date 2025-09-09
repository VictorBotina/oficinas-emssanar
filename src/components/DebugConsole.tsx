"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Terminal } from "lucide-react";

interface DebugConsoleProps {
  logs: string[];
}

export default function DebugConsole({ logs }: DebugConsoleProps) {
  return (
    <Card className="bg-gray-900 text-gray-200 font-mono">
      <CardHeader className="flex flex-row items-center gap-2 pb-2">
        <Terminal className="h-5 w-5" />
        <CardTitle className="text-lg text-gray-200">Debug Console</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-48 w-full rounded-md border border-gray-700 bg-black p-2">
          {logs.map((log, index) => (
            <div key={index} className="text-xs text-green-400 whitespace-pre-wrap">
              {log}
            </div>
          ))}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
