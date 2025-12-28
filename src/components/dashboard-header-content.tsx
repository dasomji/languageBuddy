"use client";

import { type ReactNode } from "react";
import { useHeaderContent } from "./dashboard-header-context";

interface DashboardHeaderContentProps {
  fallback?: ReactNode;
}

export function DashboardHeaderContent({
  fallback,
}: DashboardHeaderContentProps) {
  const headerContent = useHeaderContent();

  if (!headerContent) {
    return <>{fallback}</>;
  }

  return <>{headerContent}</>;
}
