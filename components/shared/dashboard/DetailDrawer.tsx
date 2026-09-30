"use client";

import type { ReactNode } from "react";

import DashboardDrawer from "./DashboardDrawer";
import IllustrativeValuesBanner from "./IllustrativeValuesBanner";
import MetricContextTable, {
  type MetricContextColumn,
  type MetricContextRow,
} from "./MetricContextTable";
import PanelFootnote from "./PanelFootnote";
import PendingStateValue from "./PendingStateValue";
import type { DrawerContent } from "@/types/dashboard";
import type { DashboardFilterState } from "./DashboardFilters";

/*
  Shell for a persona dashboard's detail drawer.

  Every approved drawer across the four personas has the same anatomy: header,
  illustrative-values banner, element-specific content, a provenance table, any
  blocking decisions, and qualifying notes. Only the middle section differs, so
  it arrives as children.

  A drawer deepens exactly one main-view element. It is not a page, and it never
  merges two elements, even when they share a panel.
*/

interface DetailDrawerProps {
  open: boolean;
  onClose: () => void;
  content?: DrawerContent;
  size?: "default" | "wide";
  children?: ReactNode;
  headerFilters?: DashboardFilterState;
  /*
    Shows the compact filter row bound to the page's global scope, so changing
    a filter without leaving the drawer re-scopes the payload behind it.
  */
  showScopeFilters?: boolean;
}

export default function DetailDrawer({
  open,
  onClose,
  content,
  size = "default",
  children,
  headerFilters,
  showScopeFilters = false,
}: DetailDrawerProps) {
  if (!content) {
    return null;
  }

  const rows = content.contextRows;

  // Columns follow the rows: a drawer that draws no scale distinction does not
  // get an empty Scale column.
  const columns: MetricContextColumn[] = [
    { id: "metric", header: "Metric" },
    { id: "calculation", header: "Calculation" },
    ...(rows.some((row) => row.scale)
      ? [{ id: "scale", header: "Scale" }]
      : []),
    ...(rows.some((row) => row.latest)
      ? [{ id: "latest", header: "Illustrative latest" }]
      : []),
    { id: "coverage", header: "Filter coverage" },
  ];

  const tableRows: MetricContextRow[] = rows.map((row) => ({
    id: row.id,
    cells: {
      metric: row.metric,
      calculation: row.calculation,
      scale: row.scale,
      latest: row.latest,
      coverage: <PendingStateValue state={row.coverage} />,
    },
  }));

  return (
    <DashboardDrawer
      open={open}
      onClose={onClose}
      eyebrow={content.eyebrow}
      title={content.title}
      description={content.description}
      size={size}
      headerFilters={headerFilters}
      showScopeFilters={showScopeFilters}
    >
      <IllustrativeValuesBanner message={content.bannerMessage} />

      {children}

      {rows.length > 0 && (
        <section>
          <h4
            className="mb-2 text-sm font-semibold"
            style={{ color: "var(--color-text-primary)" }}
          >
            Metric calculation
          </h4>
          <MetricContextTable
            columns={columns}
            rows={tableRows}
            caption={`${content.title} calculation context`}
          />
        </section>
      )}

      {content.decisions && content.decisions.length > 0 && (
        <section>
          <h4
            className="mb-2 text-sm font-semibold"
            style={{ color: "var(--color-text-primary)" }}
          >
            Decisions required
          </h4>
          <ul role="list" className="w-full">
            {content.decisions.map((decision) => (
              <li
                key={decision.id}
                className="flex items-center justify-between gap-4 border-b py-2 last:border-b-0"
                style={{ borderColor: "var(--color-chart-grid)" }}
              >
                <span
                  className="text-xs"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {decision.label}
                </span>
                {decision.pendingState ? (
                  <PendingStateValue state={decision.pendingState} />
                ) : (
                  <span
                    className="text-xs font-semibold"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    {decision.value}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {content.notes.map((note) => (
        <PanelFootnote key={note} className="pt-0">
          {note}
        </PanelFootnote>
      ))}
    </DashboardDrawer>
  );
}
