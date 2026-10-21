import {
  adaptProductOwnerMetrics,
  adaptProductOwnerTimeseries,
} from "@/lib/dashboard/productOwnerEndpointAdapter";
import { dashboardEndpointService } from "@/lib/services/dashboardEndpointService";
import { toEndpointFilters } from "@/lib/services/dashboardFilterRequest";
import type { DashboardFilters } from "@/types/dashboard";
import type {
  ProductOwnerChartId,
  ProductOwnerMetricId,
  ProductOwnerMetricsRequestDto,
  ProductOwnerTimeseriesRequestDto,
} from "@/types/dashboardEndpointDtos";
import type {
  ProductOwnerDashboardMetricsPayload,
  ProductOwnerDashboardTimeseriesPayload,
} from "@/types/productOwnerDashboard";

export type ProductOwnerFilters = Pick<
  DashboardFilters,
  "period" | "businessUnit" | "project" | "app"
>;

const METRIC_IDS: ProductOwnerMetricId[] = [
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

export const productOwnerDashboardService = {
  async getMetrics(filters: ProductOwnerFilters) {
    const request: ProductOwnerMetricsRequestDto = {
      dashboard: "product-owner",
      sections: ["product-experience-pulse"],
      metrics: METRIC_IDS,
      filters: toEndpointFilters(filters),
      options: { includePending: true, includeCoverage: true },
    };
    const response =
      await dashboardEndpointService.getMetrics<ProductOwnerDashboardMetricsPayload>(
        request,
      );

    return adaptProductOwnerMetrics(response);
  },

  async getTimeseries(chartId: ProductOwnerChartId, filters: ProductOwnerFilters) {
    const request: ProductOwnerTimeseriesRequestDto = {
      dashboard: "product-owner",
      chartId,
      metrics: CHART_METRICS[chartId],
      filters: toEndpointFilters(filters),
      granularity: "day",
      options: { includeSupportingStats: true },
    };
    const response =
      await dashboardEndpointService.getTimeseries<ProductOwnerDashboardTimeseriesPayload>(
        request,
      );

    return adaptProductOwnerTimeseries(response);
  },
};
