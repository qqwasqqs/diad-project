import React, { ReactNode } from "react";

export interface MetricListItem {
    id: string;
    icon?: ReactNode;
    label: string;
    value: ReactNode;
}

export interface MetricListProps {
    items: MetricListItem[];
    className?: string;
}

export const MetricList = ({
    items,
    className = "",
}: MetricListProps) => {
    return (
        <ul
            role="list"
            className={`w-full divide-y divide-gray-200 ${className}`}
        >
            {items.map((item) => (
                <li
                    key={item.id}
                    className="flex min-h-[30px] items-center justify-between gap-4 py-1.5"
                >
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                        {item.icon && (
                            <span
                                aria-hidden="true"
                                className="flex h-4 w-4 flex-shrink-0 items-center justify-center text-gray-500"
                            >
                                {item.icon}
                            </span>
                        )}

                        <span
                            className="truncate text-xs text-gray-700"
                            title={item.label}
                        >
                            {item.label}
                        </span>
                    </div>

                    <div className="flex-shrink-0 text-right">
                        {typeof item.value === "string" ? (
                            <span className="text-xs font-semibold text-gray-700">
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