/*
  Technical Teams response seams. No network calls and no React dependencies.

  Metrics pass through unchanged: the page renders the payload as the source
  returns it. The function is kept as a named seam so a future Splunk-shaped
  response has an obvious place to be normalised.
*/

import { assertFiniteNumber } from "@/lib/dashboard/endpointAdapterGuards";
import type { TechTeamTimeseriesResponseDto } from "@/types/dashboardEndpointDtos";
import type { TechTeamDashboardMetricsPayload } from "@/types/techTeamDashboard";
import type { TechTeamChartModel } from "@/types/techTeamDashboardModels";

export function adaptTechTeamMetrics(
  response: TechTeamDashboardMetricsPayload,
): TechTeamDashboardMetricsPayload {
  return response;
}

export function adaptTechTeamTimeseries(
  dto: TechTeamTimeseriesResponseDto,
): TechTeamChartModel {
  if (
    dto.meta.dashboard !== "tech-team" ||
    !Array.isArray(dto.series) ||
    !Array.isArray(dto.supportingStats)
  ) {
    throw new Error("Invalid Technical Teams timeseries response");
  }

  return {
    chartId: dto.meta.chartId,
    appliedFilters: dto.meta.appliedFilters,
    illustrative: dto.meta.illustrative === true,
    series: dto.series.map((item) =>
      item.status === "OK"
        ? {
            id: item.metricId,
            status: "OK" as const,
            points: item.points.map((point) => ({
              x: point.x,
              y: assertFiniteNumber(point.y, `${item.metricId} point`),
            })),
          }
        : { id: item.metricId, status: item.status, reason: item.reason },
    ),
    supportingStats: dto.supportingStats.map((item) =>
      item.status === "OK"
        ? {
            id: item.metricId,
            status: "OK" as const,
            value: assertFiniteNumber(item.value, item.metricId),
          }
        : { id: item.metricId, status: item.status, reason: item.reason },
    ),
  };
}
