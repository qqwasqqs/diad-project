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
  const exportButton = (
    <Button appearance="secondary" icon={<ArrowDownload24Regular />}>
      Export
    </Button>
  );

  return (
    <div className="w-full mb-6">

      {/*
        The title and the controls need roughly 470px and 700px respectively, so
        they only share a row once there is room for both. Below that the header
        stacks and the controls keep a single clean row of their own, instead of
        the filters wrapping into a ragged block beside the title.
      */}
      <div className="flex w-full flex-col gap-4 2xl:flex-row 2xl:items-start 2xl:gap-6">

        {/* Title */}
        <div className="min-w-0 2xl:shrink-0">
          <h1 className="text-xl font-semibold text-slate-900">
            {title}
          </h1>
            {/* Description */}
            {description && (
                <p className="mt-2 text-sm text-slate-600">
                {description}
                </p>
            )}
        </div>

        {/* Filters, with Export as the trailing item of the same wrapping row */}
        {(showFilters || showExport) && (
          <div className="min-w-0 2xl:ml-auto">
            {showFilters ? (
              <DashboardFilters trailing={showExport ? exportButton : undefined} />
            ) : (
              <div className="flex flex-wrap items-center gap-2 2xl:justify-end">
                {exportButton}
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}