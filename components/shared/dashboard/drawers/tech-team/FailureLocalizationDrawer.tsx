"use client";

import HorizontalBarList from "@/components/shared/charts/HorizontalBarList";
import DetailDrawer from "../../DetailDrawer";
import type { TechTeamDashboardPayload } from "@/types/techTeamDashboard";

/*
  Failure localization detail.

  Eight workload rates, each with its own terminal record key and eligible
  denominator. They are compared, never summed, and bar length never represents
  a raw failure count. Rate provenance, not root-cause analysis.
*/

interface FailureLocalizationDrawerProps {
  open: boolean;
  onClose: () => void;
  content?: TechTeamDashboardPayload["drawers"]["failureLocalization"];
  items: { label: string; value: number }[];
  // Upper bound of the bar track; these are small rates compared to each other.
  scaleMax: number;
}

export default function FailureLocalizationDrawer({
  open,
  onClose,
  content,
  items,
  scaleMax,
}: FailureLocalizationDrawerProps) {
  return (
    <DetailDrawer
      open={open}
      onClose={onClose}
      content={content}
      size="wide"
      showScopeFilters
    >
      <HorizontalBarList values={items} rowsPerColumn={4} max={scaleMax} />
    </DetailDrawer>
  );
}
