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
  ProductOwnerMetricsResponseDto,
  ProductOwnerTimeseriesRequestDto,
  ProductOwnerTimeseriesResponseDto,
} from "@/types/dashboardEndpointDtos";

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

export const productOwnerDashboardEndpointService = {
  async getMetrics(filters: ProductOwnerFilters) {
    const request: ProductOwnerMetricsRequestDto = {
      dashboard: "product-owner",
      sections: ["product-experience-pulse"],
      metrics: METRIC_IDS,
      filters: toEndpointFilters(filters),
      options: { includePending: true, includeCoverage: true },
    };
    const response =
      await dashboardEndpointService.getMetrics<ProductOwnerMetricsResponseDto>(
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
      await dashboardEndpointService.getTimeseries<ProductOwnerTimeseriesResponseDto>(
        request,
      );

    return adaptProductOwnerTimeseries(response);
  },
};
