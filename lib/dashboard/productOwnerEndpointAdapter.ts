/* Pure model adapters. No network calls and no React dependencies. */

import type {
  TimeseriesResponseDto,
} from "@/types/dashboardEndpointDtos";
import type {
  ProductOwnerChartModel,
} from "@/types/productOwnerDashboardModels";
import type { ProductOwnerDashboardMetricsPayload } from "@/types/productOwnerDashboard";

function finiteNumber(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Invalid ${field}: expected a finite number`);
  }
  return value;
}

export function adaptProductOwnerMetrics(
  response: ProductOwnerDashboardMetricsPayload,
): ProductOwnerDashboardMetricsPayload {
  return response;
}

export function adaptProductOwnerTimeseries(
  dto: TimeseriesResponseDto,
): ProductOwnerChartModel {
  if (
    dto.meta.dashboard !== "product-owner" ||
    !Array.isArray(dto.series) ||
    !Array.isArray(dto.supportingStats)
  ) {
    throw new Error("Invalid Product Owner timeseries response");
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
              y: finiteNumber(point.y, `${item.metricId} point`),
            })),
          }
        : { id: item.metricId, status: item.status, reason: item.reason },
    ),
    supportingStats: dto.supportingStats.map((item) =>
      item.status === "OK"
        ? {
            id: item.metricId,
            status: "OK" as const,
            value: finiteNumber(item.value, item.metricId),
          }
        : { id: item.metricId, status: item.status, reason: item.reason },
    ),
  };
}
