import { CSSProperties, ReactNode } from "react";
import { Text } from "@fluentui/react-components";

export type StatusCalloutVariant = "warning" | "success" | "danger";

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
};

export interface StatusCalloutProps {
  icon: ReactNode;
  title: string;
  primaryContent: ReactNode;
  className?: string;
  titleClassName?: string;
  variant?: StatusCalloutVariant;
}

export const StatusCallout = ({
  icon,
  title,
  primaryContent,
  className = "",
  titleClassName = "",
  variant = "warning",
}: StatusCalloutProps) => {
  const { iconBackground, iconColor } = variantStyles[variant];

  const rootClassName = cn(
    "flex min-w-0 items-center gap-4",
    className.trim(),
  );

  const titleClasses = cn("block text-slate-700", titleClassName.trim());

  return (
    <div className={rootClassName}>
      <div
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full"
        style={iconBackground}
        aria-hidden="true"
      >
        <span className="flex items-center justify-center text-2xl" style={iconColor}>
          {icon}
        </span>
      </div>

      <div className="min-w-0">
        <Text size={300} weight="medium" className={titleClasses}>
          {title}
        </Text>

        <div className="mt-1 text-lg font-semibold uppercase tracking-tight text-slate-900">
          {primaryContent}
        </div>
      </div>
    </div>
  );
};

export default StatusCallout;
