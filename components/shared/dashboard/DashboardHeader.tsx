"use client";

import { Button } from "@fluentui/react-components";
import { ArrowDownload24Regular } from "@fluentui/react-icons";
import type { ReactNode } from "react";

import DashboardFilters, { type DashboardFilterState } from "./DashboardFilters";

interface DashboardHeaderProps {
  title: string;
  description?: ReactNode;
  eyebrow?: string;
  showFilters?: boolean;
  showExport?: boolean;
  template?: "main" | "drawer";
  filterState?: DashboardFilterState;
}

export default function DashboardHeader({
  title,
  description,
  eyebrow,
  showFilters = true,
  showExport = true,
  template = "main",
  filterState,
}: DashboardHeaderProps) {
  const exportButton = (
    <Button appearance="secondary" icon={<ArrowDownload24Regular />}>
      Export
    </Button>
  );

  if (template === "drawer") {
    return (
      <div className="w-full">
        {eyebrow && (
          <span className="block text-xs uppercase tracking-[0.08em] text-slate-600">
            {eyebrow}
          </span>
        )}
        <span className="block text-lg font-semibold text-slate-900">{title}</span>
        {description && <span className="mt-1 block text-sm text-slate-600">{description}</span>}
        {showFilters && (
          <div className="mt-3">
            {filterState ? (
              <DashboardFilters size="compact" {...filterState} />
            ) : (
              <DashboardFilters size="compact" />
            )}
            {filterState && (
              <p className="mt-2 text-xs text-slate-600">
                Demo filters — displayed data is illustrative and does not change with these selections.
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mb-6 w-full">
      <div className="flex w-full flex-col gap-4 2xl:flex-row 2xl:items-start 2xl:gap-6">
        <div className="min-w-0 2xl:shrink-0">
          <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
          {description && <p className="mt-2 text-sm text-slate-600">{description}</p>}
        </div>

        {(showFilters || showExport) && (
          <div className="min-w-0 2xl:ml-auto">
            {showFilters ? (
              filterState ? (
                <DashboardFilters trailing={showExport ? exportButton : undefined} {...filterState} />
              ) : (
                <DashboardFilters trailing={showExport ? exportButton : undefined} />
              )
            ) : (
              <div className="flex flex-wrap items-center gap-2 2xl:justify-end">{exportButton}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
