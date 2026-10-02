/*
  Resource hooks for the Technical Teams main view.

  Three independent React Query resources, keyed on the selected scope, with the
  same shape the Product Owner main view uses: one metrics request and one
  request per chart family. The metric cards can render while a chart is still
  loading, and a chart that fails does not blank the panels around it.
*/

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import {
  techTeamDashboardEndpointService,
  type TechTeamFilters,
} from "@/lib/services/techTeamDashboardEndpointService";
import type { TechTeamChartId } from "@/types/dashboardEndpointDtos";

/*
  A new scope is a new query key with no cached payload. Keeping the previous
  scope's data on screen until the new one arrives stops an open drawer — which
  renders nothing without content — from closing the moment a filter is touched.
*/
const SHARED_OPTIONS = {
  refetchOnWindowFocus: false,
  placeholderData: keepPreviousData,
} as const;

export function useTechTeamMetrics(filters: TechTeamFilters) {
  return useQuery({
    queryKey: ["tech-team", "metrics", filters],
    queryFn: () => techTeamDashboardEndpointService.getMetrics(filters),
    ...SHARED_OPTIONS,
  });
}

export function useTechTeamTimeseries(
  chartId: TechTeamChartId,
  filters: TechTeamFilters,
) {
  return useQuery({
    queryKey: ["tech-team", "timeseries", chartId, filters],
    queryFn: () => techTeamDashboardEndpointService.getTimeseries(chartId, filters),
    ...SHARED_OPTIONS,
  });
}

/** Main-view composition: three independent requests, no combined API payload. */
export function useTechTeamMainViewEndpoints(filters: TechTeamFilters) {
  const metrics = useTechTeamMetrics(filters);
  const latency = useTechTeamTimeseries("request-path-health", filters);
  const quality = useTechTeamTimeseries("ai-model-quality", filters);

  return { metrics, latency, quality };
}
