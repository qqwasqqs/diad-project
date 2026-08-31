/*
  Vocabulary shared by every persona dashboard.

  These types are not specific to one dashboard. The pending-state vocabulary in
  particular is used identically across the Executive, Product Owner, Operations,
  and Technical Teams specifications, so it is defined once here rather than
  re-declared, and slightly differently, per persona.

  A persona's own file composes these into its payload; see
  `types/techTeamDashboard.ts` for the worked example.
*/

/*
  Approved unavailable-data states.

  A metric carries one of these instead of a value. It is never represented as
  zero, null, or an empty string: the calculation specifications treat a missing
  measurement and a measured zero as different facts.
*/
export type PendingState =
  | "data"
  | "definition"
  | "formula"
  | "calculation"
  | "test-results"
  | "scale"
  | "threshold"
  | "filter-breakdown"
  | "evaluator-coverage";

export interface SeriesPoint {
  // ISO day key (YYYY-MM-DD). Dashboards format it for display.
  x: string;
  y: number;
}

export interface Series {
  id: string;
  label: string;
  points: SeriesPoint[];
}

/*
  A row carries either a display-ready `value` or a `pendingState`, never both
  and never neither.
*/
export interface MetricRow {
  id: string;
  label: string;
  value?: string;
  pendingState?: PendingState;
}

/*
  A row of a drawer's provenance table.

  `coverage` is the filter-attribution state for that metric. It is a pending
  state rather than free text, so an unattributable scope can never be rendered
  as though it were honoured.
*/
export interface ContextRow {
  id: string;
  metric: string;
  calculation: string;
  // Present where a drawer distinguishes scales or latest values; omitted where
  // its table has no such column.
  scale?: string;
  latest?: string;
  coverage: PendingState;
}

/*
  Content for one detail drawer.

  Provenance travels with the values it describes: a drawer states how a number
  was produced and whether the selected scope applies to it, so the two cannot
  drift apart.
*/
export interface DrawerContent {
  eyebrow: string;
  title: string;
  description: string;
  contextRows: ContextRow[];
  // Short qualifying statements rendered as footnotes, in order.
  notes: string[];
  // Blocking decisions, shown as a register of label + pending state.
  decisions?: MetricRow[];
}

/*
  Scope selected by the global filter bar.

  Every metric must apply these before aggregation, but only where approved
  attribution exists; otherwise the affected row returns the `filter-breakdown`
  pending state rather than an unfiltered value.
*/
export interface DashboardFilters {
  period?: string;
  businessUnit?: string;
  project?: string;
  channel?: string;
}
