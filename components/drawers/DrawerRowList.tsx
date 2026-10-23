import type { ReactNode } from "react";

import MetricList, { type MetricListVariant } from "../shared/dashboard/MetricList";
import PendingStateValue from "../shared/dashboard/PendingStateValue";
import type { MetricRow } from "@/types/dashboard";

/*
  Label-and-value rows inside a drawer, from payload rows.

  Owns the one rule every caller would otherwise repeat: a row carrying a
  pending state renders that state, never its value and never a blank. Writing
  that mapping per drawer is how a stray `?? "-"` eventually turns missing data
  into something that looks measured.
*/

interface DrawerRowListProps {
  rows: MetricRow[];
  // Optional icons by row id, for lists that carry them.
  icons?: Record<string, ReactNode>;
  variant?: MetricListVariant;
  className?: string;
}

export default function DrawerRowList({
  rows,
  icons,
  variant = "compact",
  className,
}: DrawerRowListProps) {
  return (
    <MetricList
      variant={variant}
      className={className}
      items={rows.map((row) => ({
        id: row.id,
        icon: icons?.[row.id],
        label: row.label,
        value: row.pendingState ? (
          <PendingStateValue state={row.pendingState} />
        ) : (
          row.value ?? ""
        ),
      }))}
    />
  );
}
