/*
  What the Technical Teams page renders.

  These are view models, not wire shapes: each gives the page named, typed
  fields instead of making a component inspect an unknown value. A metric is
  either `OK` with its own fields, or unavailable with a status and a reason —
  there is deliberately no variant that carries a number and a pending state at
  once, and none that represents a missing measurement as zero.

  Units are settled here rather than in a component: durations are
  milliseconds, rates are percentages, cost carries its currency, and a bounded
  score carries the scale it is bounded by.
*/

import type {
  DashboardAppliedFiltersDto,
  DashboardAvailabilityStatus,
  TechTeamChartId,
  TechTeamFailureRateMetricId,
  TechTeamMetricId,
} from "./dashboardEndpointDtos";

type Unavailable = {
  status: Exclude<DashboardAvailabilityStatus, "OK">;
  reason: string;
};

/*
  The counts a rate or an average was derived from. The data contract lists them
  as aliases the source provides, so they are modelled; the approved main view
  shows only the derived value, so they are optional until a source sends them
  and a drawer displays them.
*/
interface DerivationCounts {
  eligibleCount?: number;
  requestCount?: number;
}

export type TechTeamMetricModel =
  | {
      id: "request-throughput";
      status: "OK";
      throughputRequestsPerSecond: number;
      // The window the rate was measured over, which the rate alone does not state.
      windowSeconds?: number;
      requestCount?: number;
    }
  | ({
      id: "inference-error-rate";
      status: "OK";
      errorRatePercent: number;
      errorCount?: number;
    } & DerivationCounts)
  | {
      id: "pipeline-duration-average";
      status: "OK";
      averageDurationMs: number;
      runCount?: number;
    }
  | {
      id: "indexing-ai-services-latency-average";
      status: "OK";
      averageLatencyMs: number;
    }
  | ({
      /*
        Each rate carries its own denominator. There is deliberately no shared
        one, and no track bound here: how far a bar is drawn is a presentation
        choice the chart makes, not something the source reports.
      */
      id: TechTeamFailureRateMetricId;
      status: "OK";
      failureRatePercent: number;
      failedCount?: number;
    } & DerivationCounts)
  | ({
      id: "cost-per-request";
      status: "OK";
      averageCostPerRequest: number;
      currencyCode: string;
      totalRequestCost?: number;
    } & DerivationCounts)
  | ({
      id: "token-usage-per-request";
      status: "OK";
      averageTokensPerRequest: number;
      totalTokens?: number;
    } & DerivationCounts)
  | {
      id: "mlflow-safety-score";
      status: "OK";
      mlflowSafetyScore: number;
      // 0-1. Kept separate from the 1-5 evaluator scales, never rescaled onto them.
      scaleMax: number;
    }
  | ({ id: TechTeamMetricId } & Unavailable);

export interface TechTeamMetricsModel {
  appliedFilters: DashboardAppliedFiltersDto;
  metrics: TechTeamMetricModel[];
  illustrative: boolean;
}

export type TechTeamSeriesModel =
  | { id: string; status: "OK"; points: { x: string; y: number }[] }
  | ({ id: string } & Unavailable);

export type TechTeamSupportingStatModel =
  | { id: string; status: "OK"; value: number }
  | ({ id: string } & Unavailable);

export interface TechTeamChartModel {
  chartId: TechTeamChartId;
  appliedFilters: DashboardAppliedFiltersDto;
  series: TechTeamSeriesModel[];
  supportingStats: TechTeamSupportingStatModel[];
  illustrative: boolean;
}
