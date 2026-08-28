import React, { ReactNode } from "react";
import { Card } from "@fluentui/react-components";

export interface MetricCardProps {
  icon: ReactNode;
  title: ReactNode;
  primaryContent: ReactNode;
  supportingContent?: ReactNode;

  className?: string;

  // Layout
  minWidth?: string;
  maxWidth?: string;
  minHeight?: string;
  padding?: string;
  gap?: string;

  // Icon
  iconWrapperClassName?: string;

  // Typography
  titleClassName?: string;
  valueClassName?: string;

  // Colors
  titleColorClassName?: string;
  valueColorClassName?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  icon,
  title,
  primaryContent,
  supportingContent,
  className,

  minWidth = "min-w-0",
  maxWidth = "",
  minHeight = "min-h-[110px]",
  padding = "p-4",
  gap = "gap-3",

  iconWrapperClassName = "h-10 w-10",

  titleClassName = "text-sm font-semibold",
  valueClassName = "text-2xl font-semibold",

  titleColorClassName = "text-neutral-800",
  valueColorClassName = "text-neutral-900",
}) => {
  return (
    <Card
      className={`
        flex-1
        basis-0
        flex-col
        rounded-xl
        border
        border-neutral-200
        bg-white
        shadow-sm

        ${minWidth}
        ${maxWidth}
        ${minHeight}
        ${padding}
        ${className ?? ""}
      `}
    >
      {/* Header */}
      <div className={`flex items-center ${gap}`}>
        <div
          className={`${iconWrapperClassName} flex items-center justify-center rounded-full shrink-0 icon-bg`}
        >
          {icon}
        </div>

        <div className="flex-1 min-w-0">
          <div
            className={`whitespace-normal break-words ${titleClassName} ${titleColorClassName}`}
          >
            {title}
          </div>
        </div>
      </div>

      {/* Value */}
      <div
        className={` mt-auto pt-3
          ${valueClassName}
          ${valueColorClassName}
        `}
      >
        {primaryContent}
      </div>

      {supportingContent && <div className="mt-2">{supportingContent}</div>}
    </Card>
  );
};
