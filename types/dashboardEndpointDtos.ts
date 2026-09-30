/* Wire contracts for the planned shared dashboard endpoints. */

export type DashboardAvailabilityStatus =
  | "OK"
  | "DATA_PENDING"
  | "CALCULATION_PENDING"
  | "FILTER_BREAKDOWN_UNAVAILABLE"
  | "NO_DATA"
  | "ERROR";

export interface DashboardEndpointFiltersDto {
  timeRange: { type: "relative"; value: "last_7_days" | "last_30_days" | "last_90_days" };
  businessUnits: string[];
  projects: string[];
  timezone: "UTC";
}

export interface DashboardAppliedFiltersDto {
  timeRange: DashboardEndpointFiltersDto["timeRange"]["value"];
  businessUnits: string[];
  projects: string[];
  timezone: "UTC";
}

export interface DashboardEndpointMetaDto {
  dashboard: "product-owner";
  requestId: string;
  generatedAt: string;
  appliedFilters: DashboardAppliedFiltersDto;
  /** Present only for the local fixture implementation. */
  illustrative?: true;
}

export type ProductOwnerMetricId =
  | "session-query-volume"
  | "api-error-rate"
  | "end-to-end-latency-p95"
  | "workflow-completion";

export type ProductOwnerChartId =
  | "adoption-and-engagement"
  | "experience-and-response-quality";

export interface MetricsRequestDto {
  dashboard: "product-owner";
  sections: ["product-experience-pulse"];
  metrics: ProductOwnerMetricId[];
  filters: DashboardEndpointFiltersDto;
  options: { includePending: true; includeCoverage: true };
}

export type MetricResultDto =
  | { metricId: ProductOwnerMetricId; status: "OK"; value: unknown }
  | {
      metricId: ProductOwnerMetricId;
      status: Exclude<DashboardAvailabilityStatus, "OK">;
      value: null;
      reason: string;
    };

export interface MetricsResponseDto {
  meta: DashboardEndpointMetaDto;
  metrics: MetricResultDto[];
}

export interface TimeseriesRequestDto {
  dashboard: "product-owner";
  chartId: ProductOwnerChartId;
  metrics: string[];
  filters: DashboardEndpointFiltersDto;
  granularity: "day";
  options: { includeSupportingStats: true };
}

export type SeriesResultDto =
  | {
      metricId: string;
      status: "OK";
      points: { x: string; y: number }[];
    }
  | {
      metricId: string;
      status: Exclude<DashboardAvailabilityStatus, "OK">;
      points: [];
      reason: string;
    };

export type SupportingStatDto =
  | { metricId: string; status: "OK"; value: number }
  | {
      metricId: string;
      status: Exclude<DashboardAvailabilityStatus, "OK">;
      value: null;
      reason: string;
    };

export interface TimeseriesResponseDto {
  meta: DashboardEndpointMetaDto & {
    chartId: ProductOwnerChartId;
    granularity: "day";
  };
  series: SeriesResultDto[];
  supportingStats: SupportingStatDto[];
}
