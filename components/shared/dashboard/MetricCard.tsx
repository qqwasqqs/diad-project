import React, { ReactNode } from "react";

export interface MetricCardProps {
  // Optional: cards in dense contexts (such as drawer summaries) carry no icon,
  // and the icon slot is omitted entirely rather than left as empty space.
  icon?: ReactNode;
  title: ReactNode;
  primaryContent: ReactNode;
  supportingContent?: ReactNode;

  className?: string;

  // Layout
  /*
    Reserves a fixed height for the icon-and-title row. In a row of cards, a
    title that wraps to an extra line pushes its value and supporting content
    out of line with its neighbours; reserving the space keeps them aligned.
  */
  headerMinHeight?: string;
  /*
    Pins supporting content to the bottom of the card, so a bar or caption sits
    at the same height across a row regardless of what is above it.
  */
  pinSupporting?: boolean;
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

  headerMinHeight = "",
  pinSupporting = false,
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
  const valueContainerSpacingClass = "mt-2";

  return (
    <div
      className={`
        ${pinSupporting ? "flex" : ""}
        flex-1
        basis-0
        flex-col

        ${minWidth}
        ${maxWidth}
        ${minHeight}
        ${padding}
        ${className ?? ""}
      `}
    >
      {/* Header */}
      <div className={`flex items-center ${gap} ${headerMinHeight}`}>
        {icon && (
          <div
            className={`${iconWrapperClassName} flex items-center justify-center rounded-full shrink-0 icon-bg`}
          >
            {icon}
          </div>
        )}

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
        className={`${valueContainerSpacingClass}
          ${valueClassName}
          ${valueColorClassName}
        `}
      >
        {primaryContent}
      </div>

      {supportingContent && (
        <div className={pinSupporting ? "mt-auto pt-2" : "mt-2"}>
          {supportingContent}
        </div>
      )}
    </div>
  );
};
