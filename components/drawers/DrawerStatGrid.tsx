import type { ReactNode } from "react";

import { MetricCard } from "../shared/dashboard/MetricCard";
import PendingStateValue from "../shared/dashboard/PendingStateValue";
import type { MetricRow } from "@/types/dashboard";

/*
  A row of compact value cards at the top of a drawer.

  Same pending rule as DrawerRowList: a card with a pending state shows that
  state rather than an empty value.
*/

interface DrawerStatGridProps {
  items: MetricRow[];
  icons?: Record<string, ReactNode>;
  // Cards per row at the small breakpoint and above.
  columns?: 2 | 3 | 4;
  className?: string;
}

const COLUMN_CLASS: Record<number, string> = {
  2: "grid-cols-2",
  3: "grid-cols-2 sm:grid-cols-3",
  4: "grid-cols-2 sm:grid-cols-4",
};

export default function DrawerStatGrid({
  items,
  icons,
  columns = 2,
  className = "",
}: DrawerStatGridProps) {
  return (
    <div className={`grid gap-3 ${COLUMN_CLASS[columns]} ${className}`.trim()}>
      {items.map((item) => (
        <MetricCard
          key={item.id}
          icon={icons?.[item.id]}
          title={item.label}
          primaryContent={
            item.pendingState ? (
              <PendingStateValue state={item.pendingState} />
            ) : (
              item.value
            )
          }
          className="rounded-lg border border-chart-grid"
          minHeight="min-h-0"
          titleClassName="text-xs font-medium"
          valueClassName="text-xl font-semibold"
        />
      ))}
    </div>
  );
}
