import { ThumbLike24Regular } from "@fluentui/react-icons";

import type { ProductOwnerFeedbackSummaryData } from "@/types/productOwnerDashboard";

interface ProductOwnerFeedbackSummaryProps {
  data: ProductOwnerFeedbackSummaryData;
}

const unavailableLabels: Record<
  Exclude<ProductOwnerFeedbackSummaryData["status"], "OK">,
  string
> = {
  DATA_PENDING: "DATA PENDING",
  CALCULATION_PENDING: "CALCULATION PENDING",
  FILTER_BREAKDOWN_UNAVAILABLE: "FILTER BREAKDOWN UNAVAILABLE",
  NO_DATA: "NO FEEDBACK DATA",
};

/** A compact, display-only summary of the aggregate returned by Splunk. */
export default function ProductOwnerFeedbackSummary({
  data,
}: ProductOwnerFeedbackSummaryProps) {
  return (
    <section
      aria-labelledby="product-owner-feedback-title"
      className="rounded-lg border border-slate-200 bg-slate-50/70 px-4 py-3"
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto_220px] lg:items-center lg:gap-6">
        <div className="flex min-w-0 items-start gap-3">
          <span
            aria-hidden="true"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600"
          >
            <ThumbLike24Regular />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h2
                id="product-owner-feedback-title"
                className="text-sm font-semibold text-slate-800"
              >
                User feedback
              </h2>
              {data.status === "OK" && data.illustrative && (
                <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Illustrative
                </span>
              )}
            </div>
            <p className="mt-1 text-xs leading-4 text-slate-600">
              Only applications with submitted feedback are represented; this
              does not describe every application.
            </p>
          </div>
        </div>

        {data.status === "OK" ? (
          <>
            <div className="text-sm text-slate-700">
              <span className="text-xl font-semibold text-slate-900">
                {data.positivePercent}%
              </span>{" "}
              positive
              <div className="text-xs text-slate-600">
                From {data.includedApplicationCount}{" "}
                {data.includedApplicationCount === 1
                  ? "application"
                  : "applications"}
              </div>
            </div>

            <div
              className="space-y-2"
              role="img"
              aria-label={`${data.positivePercent}% positive feedback and ${data.negativePercent}% negative feedback`}
            >
              <div className="flex items-center gap-2">
                <span className="w-14 text-[11px] text-slate-600">Positive</span>
                <div aria-hidden="true" className="h-1.5 flex-1 rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-emerald-500/70"
                    style={{ width: `${data.positivePercent}%` }}
                  />
                </div>
                <span className="w-9 text-right text-[11px] tabular-nums text-slate-600">
                  {data.positivePercent}%
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-14 text-[11px] text-slate-600">Negative</span>
                <div aria-hidden="true" className="h-1.5 flex-1 rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-rose-400/70"
                    style={{ width: `${data.negativePercent}%` }}
                  />
                </div>
                <span className="w-9 text-right text-[11px] tabular-nums text-slate-600">
                  {data.negativePercent}%
                </span>
              </div>
            </div>
          </>
        ) : (
          <div className="text-sm font-semibold text-amber-800 lg:col-span-2">
            {unavailableLabels[data.status]}
            {data.reason && (
              <p className="mt-1 text-xs font-normal text-slate-600">
                {data.reason}
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
