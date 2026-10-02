/*
  Converts Technical Teams endpoint DTOs into the page's view models.

  Pure: no network calls, no React dependencies. It validates every value the
  page will render, preserves unavailable states and their reasons, and settles
  units at this one boundary so no component has to know what the wire meant.
*/

import {
  assertFiniteNumber,
  assertNonEmptyString,
  assertOptionalFiniteNumber,
  assertRecord,
  unsupportedMetric,
} from "@/lib/dashboard/endpointAdapterGuards";
import type {
  MetricResultDto,
  TechTeamFailureRateMetricId,
  TechTeamMetricId,
  TechTeamMetricsResponseDto,
  TechTeamTimeseriesResponseDto,
} from "@/types/dashboardEndpointDtos";
import type {
  TechTeamChartModel,
  TechTeamMetricModel,
  TechTeamMetricsModel,
} from "@/types/techTeamDashboardModels";

const FAILURE_RATE_IDS = new Set<TechTeamFailureRateMetricId>([
  "failure-rate-pipeline",
  "failure-rate-job",
  "failure-rate-inference",
  "failure-rate-api-service",
  "failure-rate-training",
  "failure-rate-indexing",
  "failure-rate-transcription",
  "failure-rate-translation",
]);

function isFailureRate(
  metricId: TechTeamMetricId,
): metricId is TechTeamFailureRateMetricId {
  return FAILURE_RATE_IDS.has(metricId as TechTeamFailureRateMetricId);
}

function adaptMetric(
  row: MetricResultDto<TechTeamMetricId>,
): TechTeamMetricModel {
  if (row.status !== "OK") {
    return { id: row.metricId, status: row.status, reason: row.reason };
  }

  const value = assertRecord(row.value, row.metricId);

  /*
    The eight failure rates share one shape, so they are matched before the
    switch rather than repeated as eight identical cases.
  */
  if (isFailureRate(row.metricId)) {
    return {
      id: row.metricId,
      status: "OK",
      failureRatePercent: assertFiniteNumber(
        value.failureRatePercent,
        `${row.metricId} failureRatePercent`,
      ),
      failedCount: assertOptionalFiniteNumber(
        value.failedCount,
        `${row.metricId} failedCount`,
      ),
      eligibleCount: assertOptionalFiniteNumber(
        value.eligibleCount,
        `${row.metricId} eligibleCount`,
      ),
    };
  }

  switch (row.metricId) {
    case "request-throughput":
      return {
        id: row.metricId,
        status: "OK",
        throughputRequestsPerSecond: assertFiniteNumber(
          value.throughputRequestsPerSecond,
          "throughputRequestsPerSecond",
        ),
        requestCount: assertOptionalFiniteNumber(value.requestCount, "requestCount"),
        windowSeconds: assertOptionalFiniteNumber(value.windowSeconds, "windowSeconds"),
      };
    case "inference-error-rate":
      return {
        id: row.metricId,
        status: "OK",
        errorRatePercent: assertFiniteNumber(
          value.errorRatePercent,
          "errorRatePercent",
        ),
        errorCount: assertOptionalFiniteNumber(value.errorCount, "errorCount"),
        eligibleCount: assertOptionalFiniteNumber(value.eligibleCount, "eligibleCount"),
      };
    case "pipeline-duration-average":
      return {
        id: row.metricId,
        status: "OK",
        averageDurationMs: assertFiniteNumber(
          value.averageDurationMs,
          "averageDurationMs",
        ),
        runCount: assertOptionalFiniteNumber(value.runCount, "runCount"),
      };
    case "indexing-ai-services-latency-average":
      return {
        id: row.metricId,
        status: "OK",
        averageLatencyMs: assertFiniteNumber(
          value.averageLatencyMs,
          "averageLatencyMs",
        ),
      };
    case "cost-per-request":
      return {
        id: row.metricId,
        status: "OK",
        averageCostPerRequest: assertFiniteNumber(
          value.averageCostPerRequest,
          "averageCostPerRequest",
        ),
        // A cost without its currency cannot be labelled, so it is required.
        currencyCode: assertNonEmptyString(value.currencyCode, "currencyCode"),
        totalRequestCost: assertOptionalFiniteNumber(
          value.totalRequestCost,
          "totalRequestCost",
        ),
        requestCount: assertOptionalFiniteNumber(value.requestCount, "requestCount"),
      };
    case "token-usage-per-request":
      return {
        id: row.metricId,
        status: "OK",
        averageTokensPerRequest: assertFiniteNumber(
          value.averageTokensPerRequest,
          "averageTokensPerRequest",
        ),
        totalTokens: assertOptionalFiniteNumber(value.totalTokens, "totalTokens"),
        requestCount: assertOptionalFiniteNumber(value.requestCount, "requestCount"),
      };
    case "mlflow-safety-score":
      return {
        id: row.metricId,
        status: "OK",
        mlflowSafetyScore: assertFiniteNumber(
          value.mlflowSafetyScore,
          "mlflowSafetyScore",
        ),
        scaleMax: assertFiniteNumber(value.scaleMax, "scaleMax"),
      };
    /*
      These have no approved numeric value in the Technical Teams data
      contract. A source that returns one for them is contradicting the
      contract, so it is rejected rather than displayed.
    */
    case "token-throughput":
    case "available-token-limit":
    case "cache-hit-ratio":
    case "safety-evaluation-score":
    case "pii-leakage-agent-only":
    case "upia":
      throw new Error(`${row.metricId} has no approved numeric value`);
    default:
      return unsupportedMetric(row.metricId, "Technical Teams");
  }
}

export function adaptTechTeamMetrics(
  dto: TechTeamMetricsResponseDto,
): TechTeamMetricsModel {
  if (dto.meta.dashboard !== "tech-team" || !Array.isArray(dto.metrics)) {
    throw new Error("Invalid Technical Teams metrics response");
  }

  return {
    appliedFilters: dto.meta.appliedFilters,
    illustrative: dto.meta.illustrative === true,
    metrics: dto.metrics.map(adaptMetric),
  };
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
