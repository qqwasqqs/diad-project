/* Pure model adapters. No network calls and no React dependencies. */

import type {
  MetricResultDto,
  MetricsResponseDto,
  TimeseriesResponseDto,
} from "@/types/dashboardEndpointDtos";
import type {
  ProductOwnerChartModel,
  ProductOwnerMetricModel,
  ProductOwnerMetricsModel,
} from "@/types/productOwnerDashboardModels";

function record(value: unknown, field: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`Invalid ${field}: expected an object`);
  }
  return value as Record<string, unknown>;
}

function finiteNumber(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Invalid ${field}: expected a finite number`);
  }
  return value;
}

function adaptMetric(row: MetricResultDto): ProductOwnerMetricModel {
  if (row.status !== "OK") {
    return { id: row.metricId, status: row.status, reason: row.reason };
  }

  const value = record(row.value, row.metricId);
  switch (row.metricId) {
    case "session-query-volume":
      return {
        id: row.metricId,
        status: "OK",
        queries: finiteNumber(value.queries, "queries"),
        sessions: finiteNumber(value.sessions, "sessions"),
        queriesPerSession: finiteNumber(value.queriesPerSession, "queriesPerSession"),
      };
    case "api-error-rate":
      return {
        id: row.metricId,
        status: "OK",
        errorRatePercent: finiteNumber(value.errorRatePercent, "errorRatePercent"),
        errorRequestCount: finiteNumber(value.errorRequestCount, "errorRequestCount"),
        eligibleRequestCount: finiteNumber(value.eligibleRequestCount, "eligibleRequestCount"),
      };
    case "end-to-end-latency-p95":
      return {
        id: row.metricId,
        status: "OK",
        // The wire value is milliseconds; the Product Owner model uses seconds.
        seconds: finiteNumber(value.latencyMs, "latencyMs") / 1000,
      };
    case "workflow-completion":
      throw new Error("Workflow Completion has no approved numeric value");
  }
}

export function adaptProductOwnerMetrics(
  dto: MetricsResponseDto,
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
