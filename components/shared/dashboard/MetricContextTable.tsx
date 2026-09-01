import type { ReactNode } from "react";

/*
  Compact table making a metric's provenance explicit: how it is calculated, on
  what scale, and whether the selected filter scope can be honoured.

  Structural only. It does not know what any calculation means, and it never
  derives a value; the caller supplies every cell, including pending states.
*/

export interface MetricContextColumn {
  id: string;
  header: string;
}

export interface MetricContextRow {
  id: string;
  // Keyed by column id. A cell may be a plain string or a rendered node such as
  // a PendingStateValue.
  cells: Record<string, ReactNode>;
}

export interface MetricContextTableProps {
  columns: MetricContextColumn[];
  rows: MetricContextRow[];
  caption?: string;
  className?: string;
}

export default function MetricContextTable({
  columns,
  rows,
  caption,
  className = "",
}: MetricContextTableProps) {
  return (
    // Wide provenance tables scroll within their own bounds rather than
    // forcing the drawer to scroll horizontally.
    <div className={`w-full overflow-x-auto ${className}`.trim()}>
      <table className="w-full border-collapse text-left">
        {caption && (
          <caption className="sr-only">{caption}</caption>
        )}

        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.id}
                scope="col"
                className="whitespace-nowrap border-b px-2 py-2 text-xs font-medium first:pl-0 last:pr-0"
                style={{
                  borderColor: "var(--color-chart-grid)",
                  color: "var(--color-chart-axis)",
                }}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              {columns.map((column) => (
                <td
                  key={column.id}
                  className="border-b px-2 py-2 text-xs first:pl-0 last:pr-0"
                  style={{
                    borderColor: "var(--color-chart-grid)",
                    color: "var(--color-text-primary)",
                  }}
                >
                  {row.cells[column.id] ?? null}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
