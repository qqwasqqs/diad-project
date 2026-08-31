"use client";

/*
  Responsive grid for dashboard panels.

  `columns` selects the track count at the xl breakpoint. The default of 2 keeps
  panels in equal halves. Use 12 when a layout needs unequal widths, and give
  each child an `xl:col-span-*` class that sums to 12 per row.
*/

export type DashboardGridColumns = 2 | 12;

interface DashboardGridProps {
  children: React.ReactNode;
  columns?: DashboardGridColumns;
}

export default function DashboardGrid({
  children,
  columns = 2,
}: DashboardGridProps) {
  return (
    <div
      className={[
        "grid grid-cols-1 gap-6 w-full",
        columns === 12 ? "xl:grid-cols-12" : "xl:grid-cols-2",
      ].join(" ")}
    >
      {children}
    </div>
  );
}
