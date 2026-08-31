/*
  Data hook for the Technical Teams main view.

  Fetching lives here so the page stays a presentation component. The filters
  are part of the query key, so selecting a different scope in the global filter
  bar refetches and caches independently.
*/

import { useQuery } from "@tanstack/react-query";

import { techTeamDashboardService } from "@/lib/services/techTeamDashboardService";
import type { DashboardFilters } from "@/types/dashboard";

export function useTechTeamMainView(filters: DashboardFilters = {}) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["techTeamDashboardMainView", filters],
    queryFn: () => techTeamDashboardService.getMainView(filters),
    refetchOnWindowFocus: false,
  });

  return {
    mainViewData: data,
    isFetchingMainView: isLoading,
    isMainViewError: isError,
    mainViewError: error,
  };
}
