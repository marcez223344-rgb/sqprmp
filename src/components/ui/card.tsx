import * as React from "react";
import { cn } from "@/lib/utils/cn";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("border-border bg-surface rounded-lg border p-6 shadow-sm", className)}
      {...props}
    />
  );
}
