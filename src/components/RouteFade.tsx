"use client";
import React from "react";
import { usePathname } from "next/navigation";

export default function RouteFade({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="route-fade">
      {children}
    </div>
  );
}
