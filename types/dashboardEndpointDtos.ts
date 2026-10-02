/*
  Wire contracts for the shared dashboard endpoints.

  One request and response shape serves every persona dashboard. What differs
  per dashboard is only *which* identifiers are valid, so the identifier unions
  are declared per dashboard and the envelope is parameterized by them. A
  dashboard is identified on the wire by `dashboard`, and a response that
  carries a different one than the request asked for is rejected by the
  receiving adapter rather than rendered.
*/

export type DashboardId = "product-owner" | "tech-team";

export type DashboardAvailabilityStatus =
  | "OK"
  | "DATA_PENDING"
  | "CALCULATION_PENDING"
  | "FILTER_BREAKDOWN_UNAVAILABLE"
  | "NO_DATA"
  | "ERROR";

export type DashboardRelativeTimeRange =
  | "last_7_days"
  | "last_30_days"
  | "last_90_days";

/*
  Every dimension the filter bar can select travels on the request, including
  `apps`. A dimension the reader can choose but the request never carries would
  narrow the page in the bar and nowhere else.
*/
export interface DashboardEndpointFiltersDto {
  timeRange: { type: "relative"; value: DashboardRelativeTimeRange };
  businessUnits: string[];
  projects: string[];
  apps: string[];
  timezone: "UTC";
}

export interface DashboardAppliedFiltersDto {
  timeRange: DashboardRelativeTimeRange;
  businessUnits: string[];
  projects: string[];
  apps: string[];
  timezone: "UTC";
}

export interface DashboardEndpointMetaDto<
  Dashboard extends DashboardId = DashboardId,
> {
  dashboard: Dashboard;
  requestId: string;
  generatedAt: string;
  /*
    The scope the source actually applied, which is not necessarily the scope
    that was requested. A source that cannot bind a dimension states the scope
    it did apply here and returns the affected metrics as
    `FILTER_BREAKDOWN_UNAVAILABLE`, rather than echoing the request back.
  */
  appliedFilters: DashboardAppliedFiltersDto;
  /** Present only for a local fixture implementation. */
  illustrative?: true;
}

/* ------------------------------------------------- per-dashboard identifiers */

export type ProductOwnerSectionId = "product-experience-pulse";

export type ProductOwnerMetricId =
  | "session-query-volume"
  | "api-error-rate"
  | "end-to-end-latency-p95"
  | "workflow-completion";

export type ProductOwnerChartId =
  | "adoption-and-engagement"
  | "experience-and-response-quality";

/*
  The five section IDs in the Technical Teams data contract. `ai-model-quality`
  is one of them even though a metrics request never carries it: that section's
  values are a chart and its period-level supporting stats, which the timeseries
  endpoint returns. It is declared here so the contract is representable.
*/
export type TechTeamSectionId =
  | "request-path-health"
  | "failure-localization"
  | "capacity-and-efficiency"
  | "ai-model-quality"
  | "evaluator-readiness";

/*
  The eight Failure Localization rates are separate metric IDs because each has
  its own record grain and its own denominator. They are compared, never summed,
  and a denominator is never reused across workloads.
*/
export type TechTeamFailureRateMetricId =
  | "failure-rate-pipeline"
  | "failure-rate-job"
  | "failure-rate-inference"
  | "failure-rate-api-service"
  | "failure-rate-training"
  | "failure-rate-indexing"
  | "failure-rate-transcription"
  | "failure-rate-translation";

export type TechTeamMetricId =
  // Request-path diagnostics
  | "request-throughput"
  | "inference-error-rate"
  | "pipeline-duration-average"
  | "indexing-ai-services-latency-average"
  // Failure localization
  | TechTeamFailureRateMetricId
  // Capacity and efficiency
  | "cost-per-request"
  | "token-usage-per-request"
  | "token-throughput"
  | "available-token-limit"
  | "cache-hit-ratio"
  // Evaluator readiness and security tests
  | "safety-evaluation-score"
  | "mlflow-safety-score"
  | "pii-leakage-agent-only"
  | "upia";

export type TechTeamChartId = "request-path-health" | "ai-model-quality";

/* --------------------------------------------------------- metrics endpoint */

interface MetricsRequestBase<
  Dashboard extends DashboardId,
  Section extends string,
  Metric extends string,
> {
  dashboard: Dashboard;
  sections: Section[];
  metrics: Metric[];
  filters: DashboardEndpointFiltersDto;
  options: { includePending: true; includeCoverage: true };
}

export type ProductOwnerMetricsRequestDto = MetricsRequestBase<
  "product-owner",
  ProductOwnerSectionId,
  ProductOwnerMetricId
>;

export type TechTeamMetricsRequestDto = MetricsRequestBase<
  "tech-team",
  TechTeamSectionId,
  TechTeamMetricId
>;

export type MetricsRequestDto =
  | ProductOwnerMetricsRequestDto
  | TechTeamMetricsRequestDto;

export type MetricResultDto<Metric extends string = string> =
  | { metricId: Metric; status: "OK"; value: unknown }
  | {
      metricId: Metric;
      status: Exclude<DashboardAvailabilityStatus, "OK">;
      value: null;
      reason: string;
    };

export interface MetricsResponseDto<
  Dashboard extends DashboardId = DashboardId,
  Metric extends string = string,
> {
  meta: DashboardEndpointMetaDto<Dashboard>;
  metrics: MetricResultDto<Metric>[];
}

export type ProductOwnerMetricsResponseDto = MetricsResponseDto<
  "product-owner",
  ProductOwnerMetricId
>;

export type TechTeamMetricsResponseDto = MetricsResponseDto<
  "tech-team",
  TechTeamMetricId
>;

/* ------------------------------------------------------ timeseries endpoint */

interface TimeseriesRequestBase<
  Dashboard extends DashboardId,
  Chart extends string,
> {
  dashboard: Dashboard;
  chartId: Chart;
  metrics: string[];
  filters: DashboardEndpointFiltersDto;
  granularity: "day";
  options: { includeSupportingStats: true };
}

export type ProductOwnerTimeseriesRequestDto = TimeseriesRequestBase<
  "product-owner",
  ProductOwnerChartId
>;

export type TechTeamTimeseriesRequestDto = TimeseriesRequestBase<
  "tech-team",
  TechTeamChartId
>;

export type TimeseriesRequestDto =
  | ProductOwnerTimeseriesRequestDto
  | TechTeamTimeseriesRequestDto;

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

export interface TimeseriesResponseDto<
  Dashboard extends DashboardId = DashboardId,
  Chart extends string = string,
> {
  meta: DashboardEndpointMetaDto<Dashboard> & {
    chartId: Chart;
    granularity: "day";
  };
  series: SeriesResultDto[];
  supportingStats: SupportingStatDto[];
}

export type ProductOwnerTimeseriesResponseDto = TimeseriesResponseDto<
  "product-owner",
  ProductOwnerChartId
>;

export type TechTeamTimeseriesResponseDto = TimeseriesResponseDto<
  "tech-team",
  TechTeamChartId
>;
