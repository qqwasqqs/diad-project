"use client";

import type { ReactNode } from "react";

import DashboardDrawer from "@/components/shared/dashboard/DashboardDrawer";
import IllustrativeValuesBanner from "@/components/shared/dashboard/IllustrativeValuesBanner";
import MetricContextTable, {
  type MetricContextColumn,
  type MetricContextRow,
} from "@/components/shared/dashboard/MetricContextTable";
import PanelFootnote from "@/components/shared/dashboard/PanelFootnote";
import PendingStateValue from "@/components/shared/dashboard/PendingStateValue";
import type { TechTeamDrawerContent } from "@/types/techTeamDashboard";

/*
  Shared shell for the six approved Technical Teams detail drawers.

  Every drawer deepens exactly one main-view element and has the same anatomy:
  header, illustrative-values banner, element-specific content, a provenance
  table, any blocking decisions, and qualifying notes. Only the middle section
  differs, so it arrives as children.

  A drawer adds provenance and readiness context. It is not a page, and it never
  merges two main-view elements.
*/

interface TechTeamDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  content?: TechTeamDrawerContent;
  size?: "default" | "wide";
  children?: ReactNode;
}

export default function TechTeamDetailDrawer({
  open,
  onClose,
  content,
  size = "default",
  children,
}: TechTeamDetailDrawerProps) {
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
    >
      <IllustrativeValuesBanner />

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
