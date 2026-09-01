/*
  Response contract for the Executive main view.

  This is the shape the dashboard renders. It is intentionally the shape the API
  must return, not the shape any particular source happens to produce: mapping
  Splunk (or any other approved source) onto this contract is the API route's
  job, so the page and its components never change when the source does.

  Values arrive already normalized, correlated, deduplicated, filtered, and
  aggregated. The dashboard performs no metric calculation of its own.

  The row, series, and state vocabulary is shared across personas and lives in
  `types/dashboard.ts`.
*/

import type { MetricRow, Series } from "./dashboard";

/*
  A card in the Executive pulse row.

  `suffix` is the unit or qualifier shown beside the value at a smaller size —
  "queries" after "316K", "positive" after "84%". It is a display detail, kept
  separate from the value so the two can be typeset differently.
*/
export interface ExecutivePulseCard extends MetricRow {
  suffix?: string;
  // Second line under the value, for a card that carries period context.
  supporting?: string;
  /*
    Positive/negative split, as whole percentages. Present only on the feedback
    card, which the approved design shows as a two-part bar.
  */
  split?: {
    positive: number;
    negative: number;
  };
}

/*
  A business unit's token cost and the nested project shown beneath it.

  The project cost is a subset of the business-unit total, never an addition.
  Which project is shown — top, selected, or otherwise representative — is a
  source decision the API must make explicit; the dashboard only displays it.
*/
export interface ExecutiveCostItem {
  name: string;
  totalCost: number;
  topProjectName: string;
  topProjectCost: number;
}

export interface ExecutiveDashboardPayload {
  pulse: ExecutivePulseCard[];

  sessionAndQueryVolume: {
    /*
      Two series on separate axes: sessions and queries are different
      populations at different magnitudes and are never summed or plotted on one
      scale.
    */
    series: Series[];
    /*
      Period-level values, calculated over the whole selected period rather than
      derived from the plotted points. Distinct sessions cannot be recovered by
      summing daily buckets, because a session can appear in several.
    */
    supporting: { id: string; label: string; value: string }[];
  };

  costByBusinessUnit: {
    items: ExecutiveCostItem[];
    /*
      Infrastructure cost is a separate signal with no approved source. It is
      never added to the token-cost bars, and never inferred from them.
    */
    infrastructureCost: MetricRow;
  };

  safetyAndRisk: ExecutivePulseCard[];
}
