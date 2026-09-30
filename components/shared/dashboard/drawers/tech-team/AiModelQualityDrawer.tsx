"use client";

import DashboardLineChart, {
  type DashboardLineSeries,
} from "../../DashboardLineChart";
import DetailDrawer from "../../DetailDrawer";
import DrawerSection from "../DrawerSection";
import DrawerStatGrid from "../DrawerStatGrid";
import type { TechTeamDashboardPayload } from "@/types/techTeamDashboard";

/*
  AI and model quality detail.

  The three compatible 1-5 evaluator series share one axis. Retrieval Quality
  (1-5) and MLflow Correctness (0-1) stay off it, shown as separate cards with
  their scales visible: incompatible scales are never normalized onto one axis
  or combined into a composite score.
*/

interface AiModelQualityDrawerProps {
  open: boolean;
  onClose: () => void;
  content?: TechTeamDashboardPayload["drawers"]["aiModelQuality"];
  series: DashboardLineSeries[];
  supporting: { id: string; label: string; value: string }[];
}

export default function AiModelQualityDrawer({
  open,
  onClose,
  content,
  series,
  supporting,
}: AiModelQualityDrawerProps) {
  return (
    <DetailDrawer
      open={open}
      onClose={onClose}
      content={content}
      size="wide"
      showScopeFilters
    >
      <DrawerSection title="Quality trend">
        <DashboardLineChart
          series={series}
          axes={[{ id: "left", domain: [1, 5] }]}
          height={200}
        />
      </DrawerSection>

      <DrawerStatGrid items={supporting} />
    </DetailDrawer>
  );
}
