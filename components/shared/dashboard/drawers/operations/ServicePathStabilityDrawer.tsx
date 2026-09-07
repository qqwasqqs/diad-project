"use client";

import DashboardLineChart, {
  type DashboardLineSeries,
} from "../../DashboardLineChart";
import DetailDrawer from "../../DetailDrawer";
import PanelFootnote from "../../PanelFootnote";
import DrawerSection from "../DrawerSection";
import DrawerStatGrid from "../DrawerStatGrid";
import type { OperationsDrawers } from "@/types/operationsDashboard";

/*
  Service-path stability chart detail.

  The chart only. Its context list is a separate element with its own drawer,
  even though the two share a panel on the main view.
*/

interface ServicePathStabilityDrawerProps {
  open: boolean;
  onClose: () => void;
  content?: OperationsDrawers["servicePathStabilityChart"];
  series: DashboardLineSeries[];
}

export default function ServicePathStabilityDrawer({
  open,
  onClose,
  content,
  series,
}: ServicePathStabilityDrawerProps) {
  return (
    <DetailDrawer open={open} onClose={onClose} content={content} size="wide">
      <DrawerStatGrid columns={4} items={content?.summary ?? []} />

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
