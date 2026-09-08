import React, { ReactNode } from "react";

/*
  Ordered group of compact metric rows.

  Structural only: it does not calculate values, define metric meaning, or fetch
  data. The caller supplies the approved label and value content.
*/

export type MetricListVariant = "compact" | "prominent";

export interface MetricListItem {
    id: string;
    icon?: ReactNode;
    label: string;
    value: ReactNode;
}

export interface MetricListProps {
    items: MetricListItem[];
    /*
      compact   — small label and value on one line, for dense definition rows.
      prominent — larger label and value with a tinted circular icon badge, for
                  diagnostic context read at a glance.
    */
    variant?: MetricListVariant;
    className?: string;
}

export const MetricList = ({
    items,
    variant = "compact",
    className = "",
}: MetricListProps) => {
    const isProminent = variant === "prominent";

    return (
        <ul
            role="list"
            className={`w-full divide-y divide-gray-200 ${className}`}
            style={{ borderColor: "var(--color-chart-grid)" }}
        >
            {items.map((item) => (
                <li
                    key={item.id}
                    className={[
                        "flex items-center justify-between gap-4",
                        isProminent
                            ? "min-h-[62px] py-3"
                            : "min-h-[30px] py-1.5",
                    ].join(" ")}
                    style={{ borderColor: "var(--color-chart-grid)" }}
                >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                        {item.icon &&
                            (isProminent ? (
                                <span
                                    aria-hidden="true"
                                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                                    style={{
                                        backgroundColor: "var(--color-neutral-background-3)",
                                    }}
                                >
                                    {item.icon}
                                </span>
                            ) : (
                                <span
                                    aria-hidden="true"
                                    className="flex h-4 w-4 shrink-0 items-center justify-center"
                                    style={{ color: "var(--color-chart-axis)" }}
                                >
                                    {item.icon}
                                </span>
                            ))}

                        {/*
                          Prominent rows wrap rather than truncate: the label
                          identifies the metric, so losing its end is worse than
                          taking a second line.
                        */}
                        <span
                            className={
                                isProminent
                                    ? "text-sm leading-tight"
                                    : "truncate text-xs"
                            }
                            style={{ color: "var(--color-text-primary)" }}
                            title={item.label}
                        >
                            {item.label}
                        </span>
                    </div>

                    <div className="shrink-0 text-right">
                        {typeof item.value === "string" ? (
                            <span
                                className={
                                    isProminent
                                        ? "text-2xl font-semibold tracking-tight"
                                        : "text-xs font-semibold"
                                }
                                style={{ color: "var(--color-text-primary)" }}
                            >
                                {item.value}
                            </span>
                        ) : (
                            item.value
                        )}
                    </div>
                </li>
            ))}
        </ul>
    );
};

export default MetricList;
