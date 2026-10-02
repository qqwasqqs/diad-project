import { Text } from "@fluentui/react-components";

import type { PendingState } from "@/types/dashboard";

/*
  Renders an approved unavailable-data state in the position a metric value
  would normally occupy.

  The dashboard documentation requires that missing telemetry is never shown as
  zero, blank, or a healthy value. This component is the single implementation of
  that rule, so there is deliberately no prop that degrades a pending state into
  a number.
*/

/*
  Re-exported so a component can take the state without reaching past this
  module for its type. The vocabulary itself is shared across personas and is
  defined once in `types/dashboard`.
*/
export type { PendingState };

// The label is mapped per state rather than built from a suffix: the
// filter-breakdown state ends in UNAVAILABLE, not PENDING.
const stateLabels: Record<PendingState, string> = {
  data: "DATA PENDING",
  definition: "DEFINITION PENDING",
  formula: "FORMULA PENDING",
  calculation: "CALCULATION PENDING",
  "test-results": "TEST RESULTS PENDING",
  scale: "SCALE PENDING",
  threshold: "THRESHOLD PENDING",
  "filter-breakdown": "FILTER BREAKDOWN UNAVAILABLE",
  "evaluator-coverage": "EVALUATOR COVERAGE PENDING",
  "no-data": "NO DATA",
  unavailable: "UNAVAILABLE",
};

export interface PendingStateValueProps {
  state: PendingState;
  srDescription?: string;
  className?: string;
}

export const PendingStateValue = ({
  state,
  srDescription,
  className = "",
}: PendingStateValueProps) => {
  const label = stateLabels[state];

  return (
    <Text
      size={200}
      weight="semibold"
      className={`uppercase tracking-[0.02em] ${className}`.trim()}
      style={{ color: "var(--color-warning-content)" }}
    >
      {label}
      {srDescription && <span className="sr-only"> — {srDescription}</span>}
    </Text>
  );
};

export default PendingStateValue;
