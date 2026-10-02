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
  | "evaluator-coverage"
  /*
    The two states that are not "pending" at all, and are here because the slot
    they occupy is the same one: `no-data` is an approved definition that found
    no eligible records, and `unavailable` is a measure the source could not
    return. Neither is a measured zero, and neither may be rendered as one, so
    they are states rather than values — but they must stay distinguishable
    from a measure that is merely awaiting approval.
  */
  | "no-data"
  | "unavailable";

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
  /*
    Overrides the illustrative-values banner text. A drawer often qualifies
    something narrower than the page does — session rules, attribution, scale —
    and saying which is more useful than repeating the page-level notice.
  */
  bannerMessage?: string;
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
  app?: string;
}

/*
  A fully specified selection: every dimension has a value, `all` included.

  `DashboardFilters` above is the request shape, where a dimension may be
  absent. This is what the bar always holds and what a page reads.
*/
export interface DashboardFilterSelection {
  period: string;
  businessUnit: string;
  project: string;
  app: string;
}

/*
  One selectable value in the filter bar.

  The dimensions below are data-derived: their values are the distinct values
  present in the source, so they are served by `/api/dashboard/filters` rather
  than hard-coded in the client.
*/
export interface DashboardFilterOption {
  value: string;
  label: string;
}

/*
  Options for every data-derived filter dimension.

  `period` is absent on purpose: it is a fixed request parameter (the contract's
  relative `timeRange`), not a set of values discovered in the data, so it stays
  a constant in the filter store.
*/
export interface DashboardFilterOptions {
  businessUnit: DashboardFilterOption[];
  project: DashboardFilterOption[];
  app: DashboardFilterOption[];
}
