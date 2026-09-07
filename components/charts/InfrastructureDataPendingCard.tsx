import React from "react";

export interface InfrastructureDataPendingCardProps {
  title?: string;
  statusLabel?: string;
  value?: string;
  icon?: React.ReactNode;
}

export default function InfrastructureDataPendingCard({
  title = "Infrastructure Cost",
  statusLabel = "DATA PENDING",
  value = "",
  icon = (
    <span
      className="inline-flex h-5 w-5 items-center justify-center text-base"
      style={{ color: "var(--color-chart-axis)" }}
    >
      ⏳
    </span>
  ),
}: InfrastructureDataPendingCardProps) {
  return (
    /*
      Deliberately compact. This is a placeholder for a metric with no approved
      source, sitting beside the chart that carries the panel's actual content;
      at panel widths it must not take room the bars need.
    */
    <div
      className="flex w-[124px] shrink-0 flex-col items-center justify-center gap-2 rounded-xl border px-3 py-4 text-center"
      style={{ borderColor: "var(--color-chart-grid)" }}
    >
      <div
        className="text-xs font-medium leading-tight"
        style={{ color: "var(--color-text-primary)" }}
      >
        {title}
      </div>

      <div
        className="inline-flex h-9 w-9 items-center justify-center rounded-full"
        style={{ backgroundColor: "var(--color-neutral-background-3)" }}
      >
        {icon}
      </div>

      <div
        className="text-[11px] font-semibold uppercase tracking-[0.03em]"
        style={{ color: "var(--color-warning-content)" }}
      >
        {statusLabel}
      </div>

      {value ? (
        <div
          className="text-sm font-semibold leading-none"
          style={{ color: "var(--color-text-primary)" }}
        >
          {value}
        </div>
      ) : null}
    </div>
  );
}
