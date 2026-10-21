import { useQuery } from "@tanstack/react-query";

import {
  techTeamDashboardService,
  type TechTeamFilters,
} from "@/lib/services/techTeamDashboardService";
import type { TechTeamChartId } from "@/types/dashboardEndpointDtos";

export function useTechTeamMetrics(filters: TechTeamFilters) {
  return useQuery({
    queryKey: ["tech-team", "metrics", filters],
    queryFn: () => techTeamDashboardService.getMetrics(filters),
    refetchOnWindowFocus: false,
  });
}

export function useTechTeamTimeseries(
  chartId: TechTeamChartId,
  filters: TechTeamFilters,
) {
  return useQuery({
    queryKey: ["tech-team", "timeseries", chartId, filters],
    queryFn: () => techTeamDashboardService.getTimeseries(chartId, filters),
    refetchOnWindowFocus: false,
  });
}

/** Main-view composition: three independent requests, no combined API payload. */
export function useTechTeamMainView(filters: TechTeamFilters) {
  const metrics = useTechTeamMetrics(filters);
  const latency = useTechTeamTimeseries("request-path-health", filters);
  const quality = useTechTeamTimeseries("ai-model-quality", filters);

  return { metrics, latency, quality };
}
