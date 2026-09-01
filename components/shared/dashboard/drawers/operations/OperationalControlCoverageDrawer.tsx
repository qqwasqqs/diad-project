"use client";

import DetailDrawer from "../../DetailDrawer";
import MetricContextTable from "../../MetricContextTable";
import PendingStateValue from "../../PendingStateValue";
import DrawerSection from "../DrawerSection";
import type { OperationsDrawers } from "@/types/operationsDashboard";

/*
  Operational control coverage detail.

  What rule each control still needs, and which field family would supply the
  evidence. No compliance score is derived from these states.
*/

interface OperationalControlCoverageDrawerProps {
  open: boolean;
  onClose: () => void;
  content?: OperationsDrawers["operationalControlCoverage"];
}

export default function OperationalControlCoverageDrawer({
  open,
  onClose,
  content,
}: OperationalControlCoverageDrawerProps) {
  return (
    <DetailDrawer open={open} onClose={onClose} content={content} size="wide">
      <DrawerSection title="What each control still needs">
        <MetricContextTable
          columns={[
            { id: "control", header: "Control" },
            { id: "rule", header: "Missing rule" },
            { id: "fields", header: "Field family" },
            { id: "state", header: "State" },
          ]}
          rows={(content?.controls ?? []).map((row) => ({
            id: row.id,
            cells: {
              control: row.label,
              rule: row.missingRule,
              fields: row.fieldFamily,
              state: row.pendingState ? (
                <PendingStateValue state={row.pendingState} />
              ) : (
                row.value
              ),
            },
          }))}
          caption="Control readiness and missing rules"
        />
      </DrawerSection>
    </DetailDrawer>
  );
}
