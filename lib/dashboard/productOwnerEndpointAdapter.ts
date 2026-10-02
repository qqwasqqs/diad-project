/* Pure model adapters. No network calls and no React dependencies. */

import {
  assertFiniteNumber,
  assertRecord,
  unsupportedMetric,
} from "@/lib/dashboard/endpointAdapterGuards";
import type {
  MetricResultDto,
  ProductOwnerMetricId,
  ProductOwnerMetricsResponseDto,
  ProductOwnerTimeseriesResponseDto,
} from "@/types/dashboardEndpointDtos";
import type {
  ProductOwnerChartModel,
  ProductOwnerMetricModel,
  ProductOwnerMetricsModel,
} from "@/types/productOwnerDashboardModels";

function adaptMetric(
  row: MetricResultDto<ProductOwnerMetricId>,
): ProductOwnerMetricModel {
  if (row.status !== "OK") {
    return { id: row.metricId, status: row.status, reason: row.reason };
  }

  const value = assertRecord(row.value, row.metricId);
  switch (row.metricId) {
    case "session-query-volume":
      return {
        id: row.metricId,
        status: "OK",
        queries: assertFiniteNumber(value.queries, "queries"),
        sessions: assertFiniteNumber(value.sessions, "sessions"),
        queriesPerSession: assertFiniteNumber(
          value.queriesPerSession,
          "queriesPerSession",
        ),
      };
    case "api-error-rate":
      return {
        id: row.metricId,
        status: "OK",
        errorRatePercent: assertFiniteNumber(
          value.errorRatePercent,
          "errorRatePercent",
        ),
        errorRequestCount: assertFiniteNumber(
          value.errorRequestCount,
          "errorRequestCount",
        ),
        eligibleRequestCount: assertFiniteNumber(
          value.eligibleRequestCount,
          "eligibleRequestCount",
        ),
      };
    case "end-to-end-latency-p95":
      return {
        id: row.metricId,
        status: "OK",
        // The wire value is milliseconds; the Product Owner model uses seconds.
        seconds: assertFiniteNumber(value.latencyMs, "latencyMs") / 1000,
      };
    case "workflow-completion":
      throw new Error("Workflow Completion has no approved numeric value");
    default:
      return unsupportedMetric(row.metricId, "Product Owner");
  }
}

export function adaptProductOwnerMetrics(
  dto: ProductOwnerMetricsResponseDto,
): ProductOwnerMetricsModel {
  if (dto.meta.dashboard !== "product-owner" || !Array.isArray(dto.metrics)) {
    throw new Error("Invalid Product Owner metrics response");
  }
  return {
    appliedFilters: dto.meta.appliedFilters,
    illustrative: dto.meta.illustrative === true,
    metrics: dto.metrics.map(adaptMetric),
  };
}

export function adaptProductOwnerTimeseries(
  dto: ProductOwnerTimeseriesResponseDto,
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
