/*
  Response contract for the Technical Teams main view.

  This is the shape the dashboard renders. It is intentionally the shape the API
  must return, not the shape any particular source happens to produce: mapping
  Splunk (or any other approved source) onto this contract is the API route's
  job, so the page and its components never change when the source does.

  Values arrive already normalized, correlated, deduplicated, filtered, and
  aggregated. The dashboard performs no metric calculation of its own.
*/

// Approved unavailable-data states. A metric carries one of these instead of a
// value; it is never represented as zero, null, or an empty string.
export type TechTeamPendingState =
  | "data"
  | "definition"
  | "formula"
  | "calculation"
  | "test-results"
  | "scale"
  | "threshold"
  | "filter-breakdown"
  | "evaluator-coverage";

export interface TechTeamSeriesPoint {
  // ISO day key (YYYY-MM-DD). The dashboard formats it for display.
  x: string;
  y: number;
}

export interface TechTeamSeries {
  id: string;
  label: string;
  points: TechTeamSeriesPoint[];
}

/*
  A row carries either a display-ready `value` or a `pendingState`, never both
  and never neither.
*/
export interface TechTeamMetricRow {
  id: string;
  label: string;
  value?: string;
  pendingState?: TechTeamPendingState;
}

/*
  A row of a drawer's provenance table.

  `coverage` is the filter-attribution state for that metric. It is a pending
  state rather than free text, so an unattributable scope can never be rendered
  as though it were honoured.
*/
export interface TechTeamContextRow {
  id: string;
  metric: string;
  calculation: string;
  // Present where the drawer distinguishes scales (quality) or latest values
  // (latency); omitted where the drawer's table has no such column.
  scale?: string;
  latest?: string;
  coverage: TechTeamPendingState;
}

/*
  Content for the six approved detail drawers.

  Provenance travels with the values it describes: a drawer states how a number
  was produced and whether the selected scope applies to it, so the two cannot
  drift apart.
*/
export interface TechTeamDrawerContent {
  eyebrow: string;
  title: string;
  description: string;
  contextRows: TechTeamContextRow[];
  // Short qualifying statements rendered as footnotes, in order.
  notes: string[];
  // Blocking decisions, shown as a register of label + pending state.
  decisions?: TechTeamMetricRow[];
}

export interface TechTeamDashboardPayload {
  requestPathHealth: {
    latencySeries: TechTeamSeries[];
    diagnostics: TechTeamMetricRow[];
  };
  failureLocalization: {
    // Upper bound of the bar track. These are small rates compared against each
    // other, so the bound is supplied rather than assumed to be 100.
    scaleMax: number;
    items: { label: string; value: number }[];
  };
  capacityAndEfficiency: TechTeamMetricRow[];
  aiModelQuality: {
    series: TechTeamSeries[];
    supporting: { id: string; label: string; value: string }[];
  };
  evaluatorReadiness: TechTeamMetricRow[];

  /*
    One entry per clickable main-view element, keyed by the element it deepens.
    Each drawer adds provenance to exactly one element; it never merges two.
  */
  drawers: {
    latencyChart: TechTeamDrawerContent;
    diagnostics: TechTeamDrawerContent;
    failureLocalization: TechTeamDrawerContent;
    capacityAndEfficiency: TechTeamDrawerContent;
    aiModelQuality: TechTeamDrawerContent;
    evaluatorReadiness: TechTeamDrawerContent;
  };
}

/*
  Scope selected by the global filter bar.

  Every metric must apply these before aggregation, but only where approved
  attribution exists; otherwise the affected row returns the
  `filter-breakdown` pending state rather than an unfiltered value.
*/
export interface TechTeamDashboardFilters {
  period?: string;
  businessUnit?: string;
  project?: string;
  channel?: string;
}
