import { ReactNode } from "react";
import { Text } from "@fluentui/react-components";

export interface StatusCalloutProps {
  icon: ReactNode;
  title: string;
  primaryContent: ReactNode;
  className?: string;
}

export const StatusCallout = ({
  icon,
  title,
  primaryContent,
  className = "",
}: StatusCalloutProps) => {
  return (
    <div className={`flex items-center gap-4 min-w-0 ${className}`}>
      <div
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full iconBackground"
        aria-hidden="true"
      >
        <span
          className="flex items-center justify-center text-2xl iconColor"
        >
          {icon}
        </span>
      </div>

      <div className="min-w-0">
        <Text
          size={300}
          weight="medium"
          className="block text-status-title"
        >
          {title}
        </Text>

        <div
          className="mt-1 text-lg font-semibold uppercase tracking-tight contentColor"
        >
          {primaryContent}
        </div>
      </div>
    </div>
  );
};

export default StatusCallout;
``