/*
  Response contract for the Technical Teams main view.

  This is the shape the dashboard renders. It is intentionally the shape the API
  must return, not the shape any particular source happens to produce: mapping
  Splunk (or any other approved source) onto this contract is the API route's
  job, so the page and its components never change when the source does.

  Values arrive already normalized, correlated, deduplicated, filtered, and
  aggregated. The dashboard performs no metric calculation of its own.

  The row, series, state, and drawer vocabulary is shared across personas and
  lives in `types/dashboard.ts`. Only what is specific to this dashboard — which
  panels exist and which drawers deepen them — is defined here.
*/

import type {
  ContextRow,
  DrawerContent,
  MetricRow,
  PendingState,
  Series,
} from "./dashboard";

export interface TechTeamDashboardPayload {
  requestPathHealth: {
    latencySeries: Series[];
    diagnostics: MetricRow[];
  };
  failureLocalization: {
    // Upper bound of the bar track. These are small rates compared against each
    // other, so the bound is supplied rather than assumed to be 100.
    scaleMax: number;
    items: { label: string; value: number }[];
  };
  capacityAndEfficiency: MetricRow[];
  aiModelQuality: {
    series: Series[];
    supporting: { id: string; label: string; value: string }[];
  };
  evaluatorReadiness: MetricRow[];

  /*
    One entry per clickable main-view element, keyed by the element it deepens.
    Each drawer adds provenance to exactly one element; it never merges two.
  */
  drawers: {
    latencyChart: DrawerContent;
    diagnostics: DrawerContent;
    failureLocalization: DrawerContent;
    capacityAndEfficiency: DrawerContent;
    aiModelQuality: DrawerContent;
    evaluatorReadiness: DrawerContent;
  };
}

/*
  A fixture row: an amount with its display parts, or a pending state. The page
  formats it; nothing upstream rounds, scales, or relabels it.
*/
export interface TechTeamDashboardMetricRow {
  id: string;
  label: string;
  amount?: number;
  unit?: string;
  prefix?: string;
  decimals?: number;
  max?: number;
  pendingState?: PendingState;
}

export type TechTeamDashboardContextRow = Omit<ContextRow, "latest"> &
  Omit<TechTeamDashboardMetricRow, "id" | "label" | "pendingState">;

export interface TechTeamDashboardDrawerContent
  extends Omit<DrawerContent, "contextRows"> {
  contextRows: TechTeamDashboardContextRow[];
}

/*
  The metrics payload the page renders. It mirrors
  public/mocks/new-pages/tech-team-dashboard.json exactly.
*/
export interface TechTeamDashboardMetricsPayload {
  generatedAt: string;
  note: string;
  requestPathHealth: {
    latencySeries: Series[];
    diagnostics: TechTeamDashboardMetricRow[];
  };
  failureLocalization: {
    scaleMax: number;
    items: { label: string; value: number }[];
  };
  capacityAndEfficiency: TechTeamDashboardMetricRow[];
  aiModelQuality: {
    series: Series[];
    supporting: TechTeamDashboardMetricRow[];
  };
  evaluatorReadiness: TechTeamDashboardMetricRow[];
  drawers: Record<
    keyof TechTeamDashboardPayload["drawers"],
    TechTeamDashboardDrawerContent
  >;
}

export type TechTeamDashboardAvailabilityStatus =
  | "OK"
  | "DATA_PENDING"
  | "CALCULATION_PENDING"
  | "FILTER_BREAKDOWN_UNAVAILABLE"
  | "NO_DATA"
  | "ERROR";

export type TechTeamDashboardSeriesResult =
  | {
      metricId: string;
      status: "OK";
      points: { x: string; y: number }[];
    }
  | {
      metricId: string;
      status: Exclude<TechTeamDashboardAvailabilityStatus, "OK">;
      points: [];
      reason: string;
    };

export type TechTeamDashboardSupportingStat =
  | { metricId: string; status: "OK"; value: number }
  | {
      metricId: string;
      status: Exclude<TechTeamDashboardAvailabilityStatus, "OK">;
      value: null;
      reason: string;
    };

export interface TechTeamDashboardTimeseriesPayload {
  meta: {
    dashboard: "tech-team";
    requestId: string;
    generatedAt: string;
    appliedFilters: {
      timeRange: string;
      businessUnits: string[];
      projects: string[];
      timezone: "UTC";
    };
    illustrative?: true;
    chartId: "request-path-health" | "ai-model-quality";
    granularity: "day";
  };
  series: TechTeamDashboardSeriesResult[];
  supportingStats: TechTeamDashboardSupportingStat[];
}
