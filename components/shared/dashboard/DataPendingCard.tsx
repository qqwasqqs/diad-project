import type { ReactNode } from "react";

export interface DataPendingCardProps {
  statusLabel?: string;
  description?: ReactNode;
  icon?: ReactNode;
  className?: string;
}

export default function DataPendingCard({
  statusLabel = "DATA PENDING",
  description = "No feature identifier or usage formula supplied",
  icon,
  className = "",
}: DataPendingCardProps) {
  const defaultIcon = (
    <div className="flex items-end gap-[7px]">
      {[44, 58, 34, 20].map((height, index) => (
        <span
          key={`${height}-${index}`}
          className="block w-[10px] rounded-t-md bg-slate-600/90"
          style={{ height: `${height}px` }}
        />
      ))}
    </div>
  );

  return (
    <div
      className={[
        "flex h-full w-full flex-col justify-center bg-white",
        className,
      ].join(" ")}
    >
      <div className="flex min-h-[180px] items-center justify-center gap-6 px-5 pb-5 pt-5 sm:gap-8">
        <div className="flex h-28 w-28 items-center justify-center rounded-full bg-slate-100 sm:h-32 sm:w-32">
          {icon ?? defaultIcon}
        </div>

        <div className="flex min-w-0 flex-col items-start justify-center text-left">
          <div className="text-[clamp(2.1rem,2.6vw,3.55rem)] font-semibold uppercase leading-none tracking-[-0.06em] text-slate-500">
            {statusLabel}
          </div>
          <div className="mt-3 max-w-[420px] text-sm font-normal leading-relaxed text-slate-500 sm:text-base">
            {description}
          </div>
        </div>
      </div>
    </div>
  );
}
