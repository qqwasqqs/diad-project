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
  DrawerContent,
  MetricRow,
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
