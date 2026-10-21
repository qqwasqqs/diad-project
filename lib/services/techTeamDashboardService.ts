/*
  Builds the Technical Teams requests and hands their responses to the adapter.

  The transport and the filter conversion are shared; what is specific to this
  dashboard is which metrics and chart series it asks for, and that is stated
  here in one place rather than spread across the page.

  The metric list mirrors the Technical Teams Splunk data contract, pending
  measures included: a metric with no approved value is still requested, so the
  response states why it is unavailable instead of the page assuming it.
*/

import {
  adaptTechTeamMetrics,
  adaptTechTeamTimeseries,
} from "@/lib/dashboard/techTeamEndpointAdapter";
import { dashboardEndpointService } from "@/lib/services/dashboardEndpointService";
import { toEndpointFilters } from "@/lib/services/dashboardFilterRequest";
import type { DashboardFilters } from "@/types/dashboard";
import type {
  TechTeamChartId,
  TechTeamMetricId,
  TechTeamMetricsRequestDto,
  TechTeamSectionId,
  TechTeamTimeseriesRequestDto,
  TechTeamTimeseriesResponseDto,
} from "@/types/dashboardEndpointDtos";
import type { TechTeamDashboardMetricsPayload } from "@/types/techTeamDashboard";

export type TechTeamFilters = Pick<
  DashboardFilters,
  "period" | "businessUnit" | "project" | "app"
>;

const SECTIONS: TechTeamSectionId[] = [
  "request-path-health",
  "failure-localization",
  "capacity-and-efficiency",
  "evaluator-readiness",
];

/*
  One request covers every non-chart value on the page. They share a scope and
  are read together, so splitting them per panel would multiply round trips
  without giving any panel a useful independent state.
*/
const METRIC_IDS: TechTeamMetricId[] = [
  // Request-path diagnostics
  "request-throughput",
  "inference-error-rate",
  "pipeline-duration-average",
  "indexing-ai-services-latency-average",
  // Failure localization — eight independent rates, never summed
  "failure-rate-pipeline",
  "failure-rate-job",
  "failure-rate-inference",
  "failure-rate-api-service",
  "failure-rate-training",
  "failure-rate-indexing",
  "failure-rate-transcription",
  "failure-rate-translation",
  // Capacity and efficiency
  "cost-per-request",
  "token-usage-per-request",
  "token-throughput",
  "available-token-limit",
  "cache-hit-ratio",
  // Evaluator readiness and security tests
  "safety-evaluation-score",
  "mlflow-safety-score",
  "pii-leakage-agent-only",
  "upia",
];

const CHART_METRICS: Record<TechTeamChartId, string[]> = {
  /*
    Component latencies are measured on different populations and may overlap
    or repeat, so they are four independent series rather than parts of one
    total.
  */
  "request-path-health": [
    "end-to-end-p95",
    "model-response-average",
    "retrieval-average",
    "tool-call-average",
  ],
  // Only the compatible 1-5 evaluator scores share this axis.
  "ai-model-quality": ["groundedness", "response-coherence", "relevance-quality"],
};

export const techTeamDashboardService = {
  async getMetrics(filters: TechTeamFilters) {
    const request: TechTeamMetricsRequestDto = {
      dashboard: "tech-team",
      sections: SECTIONS,
      metrics: METRIC_IDS,
      filters: toEndpointFilters(filters),
      options: { includePending: true, includeCoverage: true },
    };
    const response =
      await dashboardEndpointService.getMetrics<TechTeamDashboardMetricsPayload>(
        request,
      );

    return adaptTechTeamMetrics(response);
  },

  async getTimeseries(chartId: TechTeamChartId, filters: TechTeamFilters) {
    const request: TechTeamTimeseriesRequestDto = {
      dashboard: "tech-team",
      chartId,
      metrics: CHART_METRICS[chartId],
      filters: toEndpointFilters(filters),
      granularity: "day",
      options: { includeSupportingStats: true },
    };
    const response =
      await dashboardEndpointService.getTimeseries<TechTeamTimeseriesResponseDto>(
        request,
      );

    return adaptTechTeamTimeseries(response);
  },
};
