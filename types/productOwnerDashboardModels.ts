import type {
  DashboardAvailabilityStatus,
  DashboardAppliedFiltersDto,
  ProductOwnerChartId,
  ProductOwnerMetricId,
} from "./dashboardEndpointDtos";

type Unavailable = {
  status: Exclude<DashboardAvailabilityStatus, "OK">;
  reason: string;
};

export type ProductOwnerMetricModel =
  | {
      id: "session-query-volume";
      status: "OK";
      queries: number;
      sessions: number;
      queriesPerSession: number;
    }
  | {
      id: "api-error-rate";
      status: "OK";
      errorRatePercent: number;
      errorRequestCount: number;
      eligibleRequestCount: number;
    }
  | {
      id: "end-to-end-latency-p95";
      status: "OK";
      seconds: number;
    }
  | { id: ProductOwnerMetricId } & Unavailable;

export interface ProductOwnerMetricsModel {
  appliedFilters: DashboardAppliedFiltersDto;
  metrics: ProductOwnerMetricModel[];
  illustrative: boolean;
}

export type ProductOwnerSeriesModel =
  | { id: string; status: "OK"; points: { x: string; y: number }[] }
  | ({ id: string } & Unavailable);

export type ProductOwnerSupportingStatModel =
  | { id: string; status: "OK"; value: number }
  | ({ id: string } & Unavailable);

export interface ProductOwnerChartModel {
  chartId: ProductOwnerChartId;
  appliedFilters: DashboardAppliedFiltersDto;
  series: ProductOwnerSeriesModel[];
  supportingStats: ProductOwnerSupportingStatModel[];
  illustrative: boolean;
}
