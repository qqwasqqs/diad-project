import { CSSProperties, ReactNode } from "react";
import { Text } from "@fluentui/react-components";

export type StatusCalloutVariant = "warning" | "success" | "danger" | "neutral";

const cn = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

const variantStyles: Record<
  StatusCalloutVariant,
  {
    iconBackground: CSSProperties;
    iconColor: CSSProperties;
  }
> = {
  warning: {
    iconBackground: { backgroundColor: "var(--color-warning-bg)" },
    iconColor: { color: "var(--color-warning-icon)" },
  },
  success: {
    iconBackground: { backgroundColor: "var(--color-success-bg)" },
    iconColor: { color: "var(--color-success-icon)" },
  },
  danger: {
    iconBackground: { backgroundColor: "var(--color-danger-bg)" },
    iconColor: { color: "var(--color-danger-icon)" },
  },
  neutral: {
    iconBackground: { backgroundColor: "var(--color-neutral-background-3)" },
    iconColor: { color: "var(--color-chart-axis)" },
  },
};

export type StatusCalloutSize = "default" | "compact";

export interface StatusCalloutProps {
  icon: ReactNode;
  title: string;
  primaryContent: ReactNode;
  className?: string;
  titleClassName?: string;
  variant?: StatusCalloutVariant;
  /*
    "compact" shrinks the icon badge and type for callouts placed several across
    a narrow panel, where a full-size badge leaves too little room for the text
    beside it.
  */
  size?: StatusCalloutSize;
}

export const StatusCallout = ({
  icon,
  title,
  primaryContent,
  className = "",
  titleClassName = "",
  variant = "warning",
  size = "default",
}: StatusCalloutProps) => {
  const { iconBackground, iconColor } = variantStyles[variant];
  const isCompact = size === "compact";

  const rootClassName = cn(
    "flex min-w-0 items-center",
    isCompact ? "gap-3" : "gap-4",
    className.trim(),
  );

  const titleClasses = cn("block text-slate-700", titleClassName.trim());

  return (
    <div className={rootClassName}>
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full",
          isCompact ? "h-10 w-10" : "h-14 w-14",
        )}
        style={iconBackground}
        aria-hidden="true"
      >
        <span
          className={cn(
            "flex items-center justify-center",
            isCompact ? "text-lg" : "text-2xl",
          )}
          style={iconColor}
        >
          {icon}
        </span>
      </div>

      <div className="min-w-0">
        <Text
          size={isCompact ? 200 : 300}
          weight="medium"
          className={titleClasses}
        >
          {title}
        </Text>

        <div
          className={cn(
            "mt-1 font-semibold uppercase tracking-tight text-slate-900",
            isCompact ? "text-sm" : "text-lg",
          )}
        >
          {primaryContent}
        </div>
      </div>
    </div>
  );
};

export default StatusCallout;
