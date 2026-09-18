interface ProductOwnerApiErrorRateProps {
  errorRatePercent: number;
  errorRequestCount: number;
  eligibleRequestCount: number;
  variant?: "card" | "drawer";
}

const countFormatter = new Intl.NumberFormat("en-US");

export default function ProductOwnerApiErrorRate({
  errorRatePercent,
  errorRequestCount,
  eligibleRequestCount,
  variant = "card",
}: ProductOwnerApiErrorRateProps) {
  const formattedRate = `${errorRatePercent.toFixed(2)}%`;
  const formattedErrorCount = countFormatter.format(errorRequestCount);
  const formattedEligibleCount = countFormatter.format(eligibleRequestCount);
  const accessibleLabel = `${formattedRate} API error rate, ${formattedErrorCount} error requests out of ${formattedEligibleCount} eligible requests`;

  if (variant === "drawer") {
    return (
      <div aria-label={accessibleLabel}>
        <div className="flex items-end justify-between gap-3">
          <div className="text-[30px] leading-none font-semibold text-neutral-950">
            {formattedRate}
          </div>
          <div className="text-right text-[10px] font-semibold uppercase tracking-[0.04em] text-slate-600">
            API errors
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] leading-4 text-slate-600">
          <div>
            <span className="block text-sm font-semibold text-slate-800">
              {formattedErrorCount}
            </span>
            error requests
          </div>
          <div className="border-l border-slate-200 pl-3">
            <span className="block text-sm font-semibold text-slate-800">
              {formattedEligibleCount}
            </span>
            eligible requests
          </div>
        </div>
      </div>
    );
  }

  return (
    <div aria-label={accessibleLabel}>
      <div className="whitespace-nowrap text-[38px] leading-none font-semibold text-neutral-950">
        {formattedRate}{" "}
        <span className="text-4xl font-normal">errors</span>
      </div>
      <div className="mt-3 text-xs font-normal text-neutral-500">
        {formattedErrorCount} of {formattedEligibleCount} eligible requests
      </div>
    </div>
  );
}
