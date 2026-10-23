"use client";

import DashboardLineChart, {
  type DashboardLineSeries,
} from "../../shared/dashboard/DashboardLineChart";
import DetailDrawer from "../../shared/dashboard/DetailDrawer";
import PanelFootnote from "../../shared/dashboard/PanelFootnote";
import DrawerSection from "../DrawerSection";
import DrawerStatGrid from "../DrawerStatGrid";
import type { TechTeamDashboardPayload } from "@/types/techTeamDashboard";

/*
  Request-path latency detail.

  The four-series chart only. The diagnostics list is a separate element with
  its own drawer, even though the two share the Request-path health panel.
*/

interface RequestPathLatencyDrawerProps {
  open: boolean;
  onClose: () => void;
  content?: TechTeamDashboardPayload["drawers"]["latencyChart"];
  series: DashboardLineSeries[];
}

export default function RequestPathLatencyDrawer({
  open,
  onClose,
  content,
  series,
}: RequestPathLatencyDrawerProps) {
  return (
    <DetailDrawer
      open={open}
      onClose={onClose}
      content={content}
      size="wide"
      showScopeFilters
    >
      {/* Latest values come from the provenance rows, so the cards and the
          table below them cannot disagree. */}
      <DrawerStatGrid
        columns={4}
        items={(content?.contextRows ?? []).map((row) => ({
          id: row.id,
          label: row.metric,
          value: row.latest,
        }))}
      />

      <DrawerSection title="Latency trend">
        <DashboardLineChart
          series={series}
          axes={[{ id: "left", label: "Latency (ms)" }]}
          height={220}
        />
        <PanelFootnote>Component times are not additive</PanelFootnote>
      </DrawerSection>
    </DetailDrawer>
  );
}
