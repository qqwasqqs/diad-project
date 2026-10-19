import {
  adaptProductOwnerMetrics,
  adaptProductOwnerTimeseries,
} from "@/lib/dashboard/productOwnerEndpointAdapter";
import { dashboardEndpointService } from "@/lib/services/dashboardEndpointService";
import type { DashboardFilters } from "@/types/dashboard";
import type {
  DashboardEndpointFiltersDto,
  MetricsRequestDto,
  ProductOwnerChartId,
  TimeseriesRequestDto,
} from "@/types/dashboardEndpointDtos";

export type ProductOwnerFilters = Pick<
  DashboardFilters,
  "period" | "businessUnit" | "project"
>;

const METRIC_IDS: MetricsRequestDto["metrics"] = [
  "session-query-volume",
  "api-error-rate",
  "end-to-end-latency-p95",
  "workflow-completion",
];

const CHART_METRICS: Record<ProductOwnerChartId, string[]> = {
  "adoption-and-engagement": ["sessions", "queries"],
  "experience-and-response-quality": [
    "groundedness",
    "relevance-quality",
    "intent-resolution",
  ],
};

function toEndpointFilters(filters: ProductOwnerFilters): DashboardEndpointFiltersDto {
  const periods: Record<string, DashboardEndpointFiltersDto["timeRange"]["value"]> = {
    "7d": "last_7_days",
    "30d": "last_30_days",
    "90d": "last_90_days",
  };
  const period = filters.period ?? "30d";
  if (!(period in periods)) {
    throw new Error(`Unsupported dashboard period: ${period}`);
  }
  return {
    timeRange: { type: "relative", value: periods[period] },
    businessUnits: [filters.businessUnit ?? "all"],
    projects: [filters.project ?? "all"],
    timezone: "UTC",
  };
}

export const productOwnerDashboardService = {
  async getMetrics(filters: ProductOwnerFilters) {
    const request: MetricsRequestDto = {
      dashboard: "product-owner",
      sections: ["product-experience-pulse"],
      metrics: METRIC_IDS,
      filters: toEndpointFilters(filters),
      options: { includePending: true, includeCoverage: true },
    };
    const response = await dashboardEndpointService.getMetrics(request);

    return adaptProductOwnerMetrics(response);
  },

  async getTimeseries(chartId: ProductOwnerChartId, filters: ProductOwnerFilters) {
    const request: TimeseriesRequestDto = {
      dashboard: "product-owner",
      chartId,
      metrics: CHART_METRICS[chartId],
      filters: toEndpointFilters(filters),
      granularity: "day",
      options: { includeSupportingStats: true },
    };
    const response = await dashboardEndpointService.getTimeseries(request);

    return adaptProductOwnerTimeseries(response);
  },
};
