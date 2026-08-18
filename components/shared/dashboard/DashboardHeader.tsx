"use client";

import { Button } from "@fluentui/react-components";
import { ArrowDownload24Regular } from "@fluentui/react-icons";
import DashboardFilters from "./DashboardFilters";

interface DashboardHeaderProps {
  title: string;
  description?: string;
  showFilters?: boolean;
  showExport?: boolean;
}

export default function DashboardHeader({
  title,
  description,
  showFilters = true,
  showExport = true,
}: DashboardHeaderProps) {
  return (
    <div className="w-full mb-6">

      {/* Top Row */}
      <div className="flex w-full items-start gap-6">

        {/* Title */}
        <div className="shrink-0 min-w-0">
          <h1 className="text-xl font-semibold text-slate-900 whitespace-nowrap">
            {title}
          </h1>
            {/* Description */}
            {description && (
                <p className="mt-2 text-sm text-slate-600">
                {description}
                </p>
            )}
        </div>

        <div className="ml-auto flex min-w-0 flex-1 items-start justify-end gap-2">
        {/* Filters */}
        {showFilters && (
          <div className="flex-1 min-w-0">
            <DashboardFilters />
          </div>
        )}

        {/* Export */}
        {showExport && (
          <div className="shrink-0">
            <Button
              appearance="secondary"
              icon={<ArrowDownload24Regular />}
            >
              Export
            </Button>
          </div>
        )}
      </div>
      </div>
      
    </div>
  );
}