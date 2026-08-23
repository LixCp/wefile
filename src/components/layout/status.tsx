"use client";
import { useState } from "react";
import { Badge } from "../ui/badge";

export function Status() {
  const [connected, setConnected] = useState<boolean | null>(true);
  return (
    <Badge
      variant="outline"
      className="gap-2 text-silver-mist border-deep-teal bg-night-slate px-3 py-1.5 text-sm font-normal"
    >
      <span
        className={`h-2 w-2 rounded-full ${
          connected
            ? "bg-cprimary shadow-[0_0_8px_rgba(79,227,193,0.55)]"
            : "bg-cred"
        }`}
      />
      {connected ? "متصل" : "در حال اتصال"}
    </Badge>
  );
}
