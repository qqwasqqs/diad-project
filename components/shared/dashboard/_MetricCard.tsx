import React, { ReactNode } from "react";
import { Card, Text } from "@fluentui/react-components";

export interface MetricCardProps {
  icon: ReactNode;
  title: ReactNode;
  primaryContent: ReactNode;
  supportingContent?: ReactNode;
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  icon,
  title,
  primaryContent,
  supportingContent,
  className,
}) => {
  return (
    <Card
      
      className={`
        flex-1
        min-w-[10px]
        max-w-[360px]
        min-h-[155]
        rounded-xl
        border border-neutral-200
        bg-white
        shadow-sm
        float-left
        m-2
        p-1
        ${className ?? ""}
      `}
    >
      {/* Header */}
      <div className="flex items-center h-[50]">
        <div
          className="
            flex h-10 w-10 items-center justify-center
            rounded-full
            shrink-0 icon-bg
          "
        >
          {icon}
        </div>

        <Text
          weight="semibold"
          className="text-sm text-neutral-700 leading-tight m-4 mt-0 mb-0"
        >
          {title}
        </Text>
      </div>

      {/* Primary Content */}
      <div className="mt-0">
        <div className="pl-5">
          {primaryContent}
        </div>
      </div>

      {/* Optional Supporting Content */}
      {supportingContent && (
        <div>
          {supportingContent}
        </div>
      )}
    </Card>
  );
};