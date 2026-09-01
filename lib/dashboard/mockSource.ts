/*
  Helpers for serving a persona dashboard's main view from a local mock.

  A mock file is a *source*: it holds numeric amounts and the widest range the
  filters can request. These helpers slice it to the selected period, apply the
  selected scope, and format display strings — the same mapping an approved
  Splunk/API source will need, kept in one place so each dashboard route stays
  small and the rules stay consistent.

  Used only in local design mode. Nothing here models what a real source is
  permitted to claim; see `attributionRule` below.
*/

import type { NextRequest } from "next/server";

import type { DashboardFilters, MetricRow, Series } from "@/types/dashboard";

export const PERIOD_DAYS: Record<string, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

export const DEFAULT_PERIOD = "30d";

/*
  A mock row carries the numbers the display string is built from, rather than
  the finished string, so it can be scaled and reformatted per scope.
*/
export interface MockMetricRow extends MetricRow {
  amount?: number;
  unit?: string;
  prefix?: string;
  decimals?: number;
  // Upper bound for bounded scores, so scaling cannot push them past their scale.
  max?: number;
}

/*
  Illustrative weight per filter dimension.

  Each selection has its own explicit weight rather than a hash, so a scope's
  numbers are readable from the code and every selection visibly moves the
  values. These are presentation weights for mock data, not measured ratios.
*/
export const SCOPE_WEIGHTS: Record<string, Record<string, number>> = {
  businessUnit: { all: 1, a: 0.84, b: 1.19 },
  project: { all: 1, a1: 0.91, b1: 1.12 },
  channel: { all: 1, web: 1.08, api: 0.86, mobile: 0.73 },
};

export function readFilters(request: NextRequest): DashboardFilters {
  const params = request.nextUrl.searchParams;

  return {
    period: params.get("period") ?? undefined,
    businessUnit: params.get("businessUnit") ?? undefined,
    project: params.get("project") ?? undefined,
    channel: params.get("channel") ?? undefined,
  };
}

export function periodDays(filters: DashboardFilters): number {
  return PERIOD_DAYS[filters.period ?? DEFAULT_PERIOD] ?? PERIOD_DAYS[DEFAULT_PERIOD];
}

export function scopeFactor(filters: DashboardFilters): number {
  const weight = (dimension: string, selected?: string) =>
    SCOPE_WEIGHTS[dimension][selected ?? "all"] ?? 1;

  return (
    weight("businessUnit", filters.businessUnit) *
    weight("project", filters.project) *
    weight("channel", filters.channel)
  );
}

/*
  Bounded scores (a 1-5 or 0-1 rating) must not move like a volume or a cost.
  Multiplying them by the scope factor drives them to a perfect score, which is
  implausible and, on a quality metric, actively misleading.

  They shift in the same direction but consume only a fraction of the headroom
  that remains to their bound, so a wider scope never produces a flawless score.
*/
export function shiftBounded(
  amount: number,
  max: number,
  factor: number,
): number {
  const delta = (factor - 1) * 0.35;

  return delta >= 0 ? amount + (max - amount) * delta : amount * (1 + delta);
}

/*
  Formats one row for the given scope.

  A pending state is never replaced by a number, whatever the scope is. A row
  with no amount passes through unchanged.
*/
export function formatRow(row: MockMetricRow, factor: number): MetricRow {
  if (row.pendingState || row.amount === undefined) {
    return {
      id: row.id,
      label: row.label,
      value: row.value,
      pendingState: row.pendingState,
    };
  }

  const scaled =
    row.max !== undefined
      ? shiftBounded(row.amount, row.max, factor)
      : row.amount * factor;

  const decimals = row.decimals ?? 0;
  const value = `${row.prefix ?? ""}${scaled.toFixed(decimals)}${row.unit ?? ""}`;

  return { id: row.id, label: row.label, value };
}

/*
  Slices each series to the selected period and applies the scope.

  Pass `max` for series on a bounded scale so their points shift rather than
  scale, for the reason given on `shiftBounded`.
*/
export function sliceSeries(
  series: Series[],
  filters: DashboardFilters,
  max?: number,
): Series[] {
  const days = periodDays(filters);
  const factor = scopeFactor(filters);

  return series.map((item) => ({
    ...item,
    points: item.points.slice(-days).map((point) => {
      const scaled =
        max !== undefined
          ? shiftBounded(point.y, max, factor)
          : point.y * factor;

      return { x: point.x, y: Number(scaled.toFixed(2)) };
    }),
  }));
}

/*
  The rule a real source must follow, recorded next to the mock helpers because
  this is where the difference matters.

  These helpers scope every metric by every filter, which is what makes a mock
  useful for exercising a UI. The calculation specifications do not permit that
  in production: a metric may apply a business-unit, project, or channel filter
  only where its source event is reliably attributed through an approved
  correlation/enrichment contract.

  When implementing a real source, classify each metric:

  - attribution approved for the selected scope -> return the filtered value;
  - attribution not approved -> return that row with
    `pendingState: "filter-breakdown"`, which renders as
    FILTER BREAKDOWN UNAVAILABLE.

  Never return a portfolio-wide value while a narrower scope is selected, and
  never substitute zero for a scope that cannot be attributed. Doing either makes
  an unfiltered number indistinguishable from a filtered one.
*/
export const attributionRule =
  "Filter where attribution is approved; return filter-breakdown where it is not.";
