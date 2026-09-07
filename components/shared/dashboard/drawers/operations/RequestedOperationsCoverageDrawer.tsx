"use client";

import DetailDrawer from "../../DetailDrawer";
import MetricContextTable from "../../MetricContextTable";
import PendingStateValue from "../../PendingStateValue";
import DrawerSection from "../DrawerSection";
import type { OperationsDrawers } from "@/types/operationsDashboard";

/*
  Requested operations coverage detail.

  A monitoring-readiness matrix: what each requirement still needs before it
  could be reported. Pending does not mean zero, healthy, or an unavailable
  service.
*/

interface RequestedOperationsCoverageDrawerProps {
  open: boolean;
  onClose: () => void;
  content?: OperationsDrawers["requestedOperationsCoverage"];
}

export default function RequestedOperationsCoverageDrawer({
  open,
  onClose,
  content,
}: RequestedOperationsCoverageDrawerProps) {
  return (
    <DetailDrawer open={open} onClose={onClose} content={content} size="wide">
      <DrawerSection title="Monitoring readiness">
        <MetricContextTable
          columns={[
            { id: "requirement", header: "Requirement" },
            { id: "missing", header: "Missing contract" },
            { id: "state", header: "State" },
          ]}
          rows={(content?.matrix ?? []).map((row) => ({
            id: row.id,
            cells: {
              requirement: row.label,
              missing: row.missingContract,
              state: row.pendingState ? (
                <PendingStateValue state={row.pendingState} />
              ) : (
                row.value
              ),
            },
          }))}
          caption="Monitoring readiness by requirement"
        />
      </DrawerSection>
    </DetailDrawer>
  );
}
