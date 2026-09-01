/*
  Response contract for the Operations Team main view.

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

export interface OperationsDashboardPayload {
  /*
    Measured stability signals plus the alert feed, which has no approved
    threshold and so carries a pending state rather than a count.
  */
  operationalSituation: MetricRow[];

  /*
    Requirements Operations has asked for that cannot yet be reported. These are
    explicitly not zero values and not live health indicators: an uptime figure
    must not be inferred from response status, and CPU, memory, and load have no
    contract at all.
  */
  requestedOperationsCoverage: MetricRow[];

  servicePathStability: {
    /*
      Four millisecond series. End-to-End is P95 at request grain; the three
      component series are averages. They are not a decomposition of end-to-end
      time, since components can overlap, repeat, run asynchronously, or be
      absent.
    */
    latencySeries: Series[];
    /*
      Operational traffic and asynchronous-workload context. Not additive parts
      of request latency, and not threshold statuses.
    */
    diagnostics: MetricRow[];
  };

  failureSurface: {
    // Upper bound of the bar track; these are small rates compared to each other.
    scaleMax: number;
    /*
      Nine workloads, each with its own final record key, source taxonomy, and
      eligible denominator. The rates are compared, never summed, and bar length
      never represents a raw failure count.
    */
    items: { label: string; value: number }[];
  };

  /*
    Readiness states only. No numeric aggregation is authorized for this
    section, so every entry carries a pending state.
  */
  operationalControlCoverage: MetricRow[];

  safetyAndSecurityReadiness: MetricRow[];
}
