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
    <span className="inline-flex h-7 w-7 items-center justify-center text-lg text-slate-600">
      ⏳
    </span>
  ),
}: InfrastructureDataPendingCardProps) {
  return (
    <div className="flex h-full min-h-[240px] w-[200px] min-w-[200px] flex-col rounded-2xl border border-slate-200 bg-white px-6 py-7 shadow-sm">
      <div className="text-xl font-medium leading-tight text-slate-800">{title}</div>

      <div className="mt-8 flex flex-1 items-center justify-center">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-600">
          {icon}
        </div>
      </div>

      <div className="mt-6 text-center text-sm font-semibold uppercase tracking-[0.03em] text-slate-500">
        {statusLabel}
      </div>

      {value ? (
        <div className="mt-3 text-center text-xl font-semibold leading-none text-slate-700">
          {value}
        </div>
      ) : null}
    </div>
  );
}
