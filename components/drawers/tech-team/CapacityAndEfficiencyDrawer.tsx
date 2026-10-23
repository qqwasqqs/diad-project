"use client";

import DetailDrawer from "../../shared/dashboard/DetailDrawer";
import DrawerStatGrid from "../DrawerStatGrid";
import type { MetricRow } from "@/types/dashboard";
import type { TechTeamDashboardPayload } from "@/types/techTeamDashboard";

/*
  Capacity and efficiency detail.

  Cards carry only the two calculated values. The three unresolved definitions
  stay in the drawer's decisions register rather than appearing as cards, so a
  pending definition is never mistaken for a measurement.
*/

interface CapacityAndEfficiencyDrawerProps {
  open: boolean;
  onClose: () => void;
  content?: TechTeamDashboardPayload["drawers"]["capacityAndEfficiency"];
  rows: MetricRow[];
}

export default function CapacityAndEfficiencyDrawer({
  open,
  onClose,
  content,
  rows,
}: CapacityAndEfficiencyDrawerProps) {
  return (
    <DetailDrawer
      open={open}
      onClose={onClose}
      content={content}
      size="wide"
      showScopeFilters
    >
      <DrawerStatGrid items={rows.filter((row) => !row.pendingState)} />
    </DetailDrawer>
  );
}
