/*
  Data hook for the Technical Teams main view.

  Fetching lives here so the page stays a presentation component. The filters
  are part of the query key, so selecting a different scope refetches and caches
  independently once the global filter bar is wired to state.
*/

import { useQuery } from "@tanstack/react-query";

import { techTeamDashboardService } from "@/lib/services/techTeamDashboardService";
import type { TechTeamDashboardFilters } from "@/types/techTeamDashboard";

export function useTechTeamMainView(filters: TechTeamDashboardFilters = {}) {
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
