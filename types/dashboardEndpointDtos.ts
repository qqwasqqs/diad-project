/* Wire contracts for the planned shared dashboard endpoints. */

export type DashboardId = "product-owner" | "tech-team";

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
  dashboard: DashboardId;
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

// Identifiers from the Technical Teams Splunk data contract.
export type TechTeamSectionId =
  | "request-path-health"
  | "failure-localization"
  | "capacity-and-efficiency"
  | "ai-model-quality"
  | "evaluator-readiness";

export type TechTeamMetricId =
  | "request-throughput"
  | "inference-error-rate"
  | "pipeline-duration-average"
  | "indexing-ai-services-latency-average"
  | "failure-rate-pipeline"
  | "failure-rate-job"
  | "failure-rate-inference"
  | "failure-rate-api-service"
  | "failure-rate-training"
  | "failure-rate-indexing"
  | "failure-rate-transcription"
  | "failure-rate-translation"
  | "cost-per-request"
  | "token-usage-per-request"
  | "token-throughput"
  | "available-token-limit"
  | "cache-hit-ratio"
  | "safety-evaluation-score"
  | "mlflow-safety-score"
  | "pii-leakage-agent-only"
  | "upia";

export type TechTeamChartId = "request-path-health" | "ai-model-quality";

interface MetricsRequestOptions {
  filters: DashboardEndpointFiltersDto;
  options: { includePending: true; includeCoverage: true };
}

export type MetricsRequestDto =
  | (MetricsRequestOptions & {
      dashboard: "product-owner";
      sections: ["product-experience-pulse"];
      metrics: ProductOwnerMetricId[];
    })
  | (MetricsRequestOptions & {
      dashboard: "tech-team";
      sections: TechTeamSectionId[];
      metrics: TechTeamMetricId[];
    });

export type MetricResultDto =
  | { metricId: ProductOwnerMetricId | TechTeamMetricId; status: "OK"; value: unknown }
  | {
      metricId: ProductOwnerMetricId | TechTeamMetricId;
      status: Exclude<DashboardAvailabilityStatus, "OK">;
      value: null;
      reason: string;
    };

export interface MetricsResponseDto {
  meta: DashboardEndpointMetaDto;
  metrics: MetricResultDto[];
}

interface TimeseriesRequestOptions {
  metrics: string[];
  filters: DashboardEndpointFiltersDto;
  granularity: "day";
  options: { includeSupportingStats: true };
}

export type TimeseriesRequestDto =
  | (TimeseriesRequestOptions & {
      dashboard: "product-owner";
      chartId: ProductOwnerChartId;
    })
  | (TimeseriesRequestOptions & {
      dashboard: "tech-team";
      chartId: TechTeamChartId;
    });

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
    chartId: ProductOwnerChartId | TechTeamChartId;
    granularity: "day";
  };
  series: SeriesResultDto[];
  supportingStats: SupportingStatDto[];
}
