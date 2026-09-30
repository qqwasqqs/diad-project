/*
  Data hook for the Technical Teams main view.

  Fetching lives here so the page stays a presentation component. The filters
  are part of the query key, so selecting a different scope in the global filter
  bar refetches and caches independently.
*/

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { techTeamDashboardService } from "@/lib/services/techTeamDashboardService";
import type { DashboardFilters } from "@/types/dashboard";

export function useTechTeamMainView(filters: DashboardFilters = {}) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["techTeamDashboardMainView", filters],
    queryFn: () => techTeamDashboardService.getMainView(filters),
    refetchOnWindowFocus: false,
    /*
      The scope is part of the query key, so a new selection is a new query with
      no cached payload. Without this the page would hand its drawers
      `undefined` for a render, and an open drawer — which renders nothing
      without content — would close the moment a filter in its own header was
      touched. The previous scope's payload stays on screen until the new one
      arrives instead.
    */
    placeholderData: keepPreviousData,
  });

  return {
    mainViewData: data,
    isFetchingMainView: isLoading,
    isMainViewError: isError,
    mainViewError: error,
  };
}
