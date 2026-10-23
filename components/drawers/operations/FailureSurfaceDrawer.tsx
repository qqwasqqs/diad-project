"use client";

import HorizontalBarList from "@/components/shared/charts/HorizontalBarList";
import DetailDrawer from "../../shared/dashboard/DetailDrawer";
import type { OperationsDrawers } from "@/types/operationsDashboard";

/*
  Failure surface detail.

  Nine workload rates, each with its own final record key and eligible
  denominator. They are compared, never summed, and bar length never represents
  a raw failure count. Rate provenance, not root-cause analysis.
*/

interface FailureSurfaceDrawerProps {
  open: boolean;
  onClose: () => void;
  content?: OperationsDrawers["failureSurface"];
  items: { label: string; value: number }[];
  // Upper bound of the bar track; these are small rates compared to each other.
  scaleMax: number;
}

export default function FailureSurfaceDrawer({
  open,
  onClose,
  content,
  items,
  scaleMax,
}: FailureSurfaceDrawerProps) {
  return (
    <DetailDrawer open={open} onClose={onClose} content={content} size="wide">
      <HorizontalBarList
        values={items}
        rowsPerColumn={3}
        columns={3}
        flow="row"
        max={scaleMax}
      />
    </DetailDrawer>
  );
}
