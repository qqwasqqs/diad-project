"use client";

import type { ReactNode } from "react";

import DetailDrawer from "../../DetailDrawer";
import DrawerStatGrid from "../DrawerStatGrid";
import type { MetricRow } from "@/types/dashboard";
import type { TechTeamDashboardPayload } from "@/types/techTeamDashboard";

/*
  Request-path diagnostics detail.

  The four right-side measures only. The four-series latency chart is
  deliberately absent: it is a separate clickable element with its own drawer.
  These are diagnostic context, not additive parts of request latency.
*/

interface RequestPathDiagnosticsDrawerProps {
  open: boolean;
  onClose: () => void;
  content?: TechTeamDashboardPayload["drawers"]["diagnostics"];
  diagnostics: MetricRow[];
  icons?: Record<string, ReactNode>;
}

export default function RequestPathDiagnosticsDrawer({
  open,
  onClose,
  content,
  diagnostics,
  icons,
}: RequestPathDiagnosticsDrawerProps) {
  return (
    <DetailDrawer
      open={open}
      onClose={onClose}
      content={content}
      size="wide"
      showScopeFilters
    >
      <DrawerStatGrid items={diagnostics} icons={icons} />
    </DetailDrawer>
  );
}
