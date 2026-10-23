"use client";

import DashboardLineChart, {
  type DashboardLineSeries,
} from "../../shared/dashboard/DashboardLineChart";
import DetailDrawer from "../../shared/dashboard/DetailDrawer";
import DrawerSection from "../DrawerSection";
import DrawerStatGrid from "../DrawerStatGrid";
import type { OperationsDrawers } from "@/types/operationsDashboard";

/*
  Operational situation detail.

  Shows direction and calculation provenance, not a composite health score or an
  incident conclusion.
*/

interface OperationalSituationDrawerProps {
  open: boolean;
  onClose: () => void;
  content?: OperationsDrawers["operationalSituation"];
  /*
    Latency belongs on the left axis in milliseconds and the two rates on the
    right in percent: seconds and percentages are different units and never
    share a scale. The caller supplies the series already assigned to an axis.
  */
  series: DashboardLineSeries[];
}

export default function OperationalSituationDrawer({
  open,
  onClose,
  content,
  series,
}: OperationalSituationDrawerProps) {
  return (
    <DetailDrawer open={open} onClose={onClose} content={content} size="wide">
      <DrawerStatGrid columns={4} items={content?.summary ?? []} />

      <DrawerSection title="30-day direction">
        <DashboardLineChart
          series={series}
          axes={[
            { id: "left", label: "Latency (ms)" },
            { id: "right", label: "Rate (%)" },
          ]}
          height={220}
        />
      </DrawerSection>
    </DetailDrawer>
  );
}
