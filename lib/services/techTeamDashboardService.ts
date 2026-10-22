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
  TechTeamSectionId,
} from "@/types/dashboardEndpointDtos";
import type {
  TechTeamDashboardMetricsPayload,
  TechTeamDashboardTimeseriesPayload,
} from "@/types/techTeamDashboard";

export type TechTeamFilters = Pick<
  DashboardFilters,
  "period" | "businessUnit" | "project"
>;

const SECTION_IDS: TechTeamSectionId[] = [
  "request-path-health",
  "failure-localization",
  "capacity-and-efficiency",
  "evaluator-readiness",
];

const METRIC_IDS: TechTeamMetricId[] = [
  "request-throughput",
  "inference-error-rate",
  "pipeline-duration-average",
  "indexing-ai-services-latency-average",
  "failure-rate-pipeline",
  "failure-rate-job",
  "failure-rate-inference",
  "failure-rate-api-service",
  "failure-rate-training",
  "failure-rate-indexing",
  "failure-rate-transcription",
  "failure-rate-translation",
  "cost-per-request",
  "token-usage-per-request",
  "token-throughput",
  "available-token-limit",
  "cache-hit-ratio",
  "safety-evaluation-score",
  "mlflow-safety-score",
  "pii-leakage-agent-only",
  "upia",
];

const CHART_METRICS: Record<TechTeamChartId, string[]> = {
  "request-path-health": [
    "end-to-end-p95",
    "model-response-average",
    "retrieval-average",
    "tool-call-average",
  ],
  "ai-model-quality": ["groundedness", "response-coherence", "relevance-quality"],
};

export const techTeamDashboardService = {
  async getMetrics(filters: TechTeamFilters) {
    const response =
      await dashboardEndpointService.getMetrics<TechTeamDashboardMetricsPayload>({
        dashboard: "tech-team",
        sections: SECTION_IDS,
        metrics: METRIC_IDS,
        filters: toEndpointFilters(filters),
        options: { includePending: true, includeCoverage: true },
      });

    return adaptTechTeamMetrics(response);
  },

  async getTimeseries(chartId: TechTeamChartId, filters: TechTeamFilters) {
    const response =
      await dashboardEndpointService.getTimeseries<TechTeamDashboardTimeseriesPayload>({
        dashboard: "tech-team",
        chartId,
        metrics: CHART_METRICS[chartId],
        filters: toEndpointFilters(filters),
        granularity: "day",
        options: { includeSupportingStats: true },
      });

    return adaptTechTeamTimeseries(response);
  },
};
