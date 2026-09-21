"use client";

import { useQuery } from "@tanstack/react-query";

import { dashboardFiltersService } from "@/lib/services/dashboardFiltersService";
import type { DashboardFilterOptions } from "@/types/dashboard";

/*
  Placeholder shown while the options load, and after a failed load.

  It carries only the `all` entry per dimension: the default selection, which is
  already applied, so the bar reads correctly and nothing offers a scope the
  source has not confirmed. A failed load must never fall back to an invented
  list of business units, projects, or apps.
*/
const UNRESOLVED_OPTIONS: DashboardFilterOptions = {
  businessUnit: [{ value: "all", label: "All business units" }],
  project: [{ value: "all", label: "All projects" }],
  app: [{ value: "all", label: "All applications" }],
};

/**
 * Data hook for the global filter bar's options.
 *
 * The options change far less often than the metrics they scope, so they are
 * fetched once per session rather than per selection.
 */
export function useDashboardFilterOptions() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["dashboardFilterOptions"],
    queryFn: () => dashboardFiltersService.getFilterOptions(),
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });

  return {
    filterOptions: data ?? UNRESOLVED_OPTIONS,
    isFetchingFilterOptions: isLoading,
    isFilterOptionsError: isError,
    filterOptionsError: error,
  };
}
