/*
  Technical Teams main-view endpoint.

  This route is the single seam between the dashboard and its data source. The
  page, its hook, and its service all speak `TechTeamDashboardPayload`, so
  moving from local mock data to Splunk (or any approved API) means replacing
  `loadFromSource` below and changing nothing else.

  In local design mode the payload is built from the static mock so the page can
  be developed without external systems. Outside local design mode the real
  source is required: the route fails loudly rather than serving illustrative
  numbers that would be indistinguishable from measured ones.
*/

import { promises as fs } from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";

import { isLocalDesignModeServer } from "@/lib/localDesignMode";
import type {
  TechTeamDashboardFilters,
  TechTeamDashboardPayload,
  TechTeamMetricRow,
} from "@/types/techTeamDashboard";

const MOCK_PATH = path.join(
  process.cwd(),
  "public",
  "mocks",
  "new-pages",
  "tech-team-dashboard.json",
);

const PERIOD_DAYS: Record<string, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

/*
  Shape of the mock file. It holds numeric amounts and a full 90-day range,
  because the mock is a source to be filtered and formatted, not a
  ready-made response. Mapping it onto the public contract is this route's job,
  exactly as mapping a Splunk report would be.
*/
interface MockRow extends TechTeamMetricRow {
  amount?: number;
  unit?: string;
  prefix?: string;
  decimals?: number;
  // Upper bound for bounded scores, so scaling cannot push them past their scale.
  max?: number;
}

interface MockPayload
  extends Omit<
    TechTeamDashboardPayload,
    "requestPathHealth" | "capacityAndEfficiency" | "aiModelQuality" | "evaluatorReadiness"
  > {
  requestPathHealth: {
    latencySeries: TechTeamDashboardPayload["requestPathHealth"]["latencySeries"];
    diagnostics: MockRow[];
  };
  capacityAndEfficiency: MockRow[];
  aiModelQuality: {
    series: TechTeamDashboardPayload["aiModelQuality"]["series"];
    supporting: (MockRow & { label: string })[];
  };
  evaluatorReadiness: MockRow[];
}

function readFilters(request: NextRequest): TechTeamDashboardFilters {
  const params = request.nextUrl.searchParams;

  return {
    period: params.get("period") ?? undefined,
    businessUnit: params.get("businessUnit") ?? undefined,
    project: params.get("project") ?? undefined,
    channel: params.get("channel") ?? undefined,
  };
}

/*
  Illustrative weight per filter dimension.

  Each selection has its own explicit weight rather than a hash, so a scope's
  numbers are readable from the code and every selection visibly moves the
  values. These are presentation weights for mock data, not measured ratios.
*/
const SCOPE_WEIGHTS: Record<string, Record<string, number>> = {
  businessUnit: { all: 1, a: 0.84, b: 1.19 },
  project: { all: 1, a1: 0.91, b1: 1.12 },
  channel: { all: 1, web: 1.08, api: 0.86, mobile: 0.73 },
};

function scopeFactor(filters: TechTeamDashboardFilters): number {
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
function shiftBounded(amount: number, max: number, factor: number): number {
  const delta = (factor - 1) * 0.35;

  return delta >= 0
    ? amount + (max - amount) * delta
    : amount * (1 + delta);
}

function formatRow(row: MockRow, factor: number): TechTeamMetricRow {
  // A pending state is never replaced by a number, whatever the scope.
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
  Applies the selected scope to the mock.

  IMPORTANT — this is deliberately more permissive than the real source may be.

  Every metric here responds to every filter, because the mock exists to exercise
  the UI. The calculation specifications do not permit that in production: a
  metric may apply a business-unit, project, or channel filter only where its
  source event is reliably attributed through an approved Splunk
  correlation/enrichment contract.

  When `loadFromSource` is implemented, each metric must be classified:

  - attribution approved for the selected scope -> return the filtered value;
  - attribution not approved -> return that row with
    `pendingState: "filter-breakdown"`, which renders as
    FILTER BREAKDOWN UNAVAILABLE.

  Never return a portfolio-wide value while a narrower scope is selected, and
  never substitute zero for a scope that cannot be attributed. Doing either makes
  an unfiltered number indistinguishable from a filtered one.

  The drawers already state `filter-breakdown` as their coverage for every
  metric, so today the main view is more confident about attribution than the
  provenance tables behind it. That gap closes when the real contract lands.
*/
function applyFilters(
  mock: MockPayload,
  filters: TechTeamDashboardFilters,
): TechTeamDashboardPayload {
  const days = PERIOD_DAYS[filters.period ?? "30d"] ?? 30;
  const factor = scopeFactor(filters);

  const sliceSeries = (
    series: TechTeamDashboardPayload["aiModelQuality"]["series"],
    max?: number,
  ) =>
    series.map((item) => ({
      ...item,
      points: item.points.slice(-days).map((point) => {
        const scaled =
          max !== undefined
            ? shiftBounded(point.y, max, factor)
            : point.y * factor;
        return { x: point.x, y: Number(scaled.toFixed(2)) };
      }),
    }));

  return {
    ...mock,
    requestPathHealth: {
      latencySeries: sliceSeries(mock.requestPathHealth.latencySeries),
      diagnostics: mock.requestPathHealth.diagnostics.map((row) =>
        formatRow(row, factor),
      ),
    },
    failureLocalization: {
      ...mock.failureLocalization,
      items: mock.failureLocalization.items.map((item) => ({
        ...item,
        value: Number((item.value * factor).toFixed(2)),
      })),
    },
    capacityAndEfficiency: mock.capacityAndEfficiency.map((row) =>
      formatRow(row, factor),
    ),
    aiModelQuality: {
      // Quality scores are bounded by their scale; scaling must not exceed it.
      series: sliceSeries(mock.aiModelQuality.series, 5),
      supporting: mock.aiModelQuality.supporting.map((row) => {
        const formatted = formatRow(row, factor);
        return {
          id: row.id,
          label: row.label,
          value: formatted.value ?? "",
        };
      }),
    },
    evaluatorReadiness: mock.evaluatorReadiness.map((row) =>
      formatRow(row, factor),
    ),
  };
}

async function loadMockPayload(
  filters: TechTeamDashboardFilters,
): Promise<TechTeamDashboardPayload> {
  const file = await fs.readFile(MOCK_PATH, "utf-8");
  return applyFilters(JSON.parse(file) as MockPayload, filters);
}

/*
  Replace this with the approved source call.

  The implementation must return `TechTeamDashboardPayload` with the selected
  filters already applied, per metric, following the attribution rule documented
  on `applyFilters` above: filter where attribution is approved, and return
  `pendingState: "filter-breakdown"` where it is not.

  Do not copy the mock's behaviour of scoping everything unconditionally. It is
  a UI fixture, not a model of what the source is allowed to claim.

  Suggested shape once the contract exists:

    const report = await splunkReportService.getTechTeamMainView(filters);
    return mapSplunkReportToPayload(report);
*/
async function loadFromSource(
  filters: TechTeamDashboardFilters,
): Promise<TechTeamDashboardPayload> {
  void filters;

  throw new Error(
    "Technical Teams main-view source is not configured. Supply the approved " +
      "Splunk/API contract in loadFromSource, or run with local design mode enabled.",
  );
}

export async function GET(request: NextRequest) {
  const filters = readFilters(request);

  try {
    const payload = isLocalDesignModeServer()
      ? await loadMockPayload(filters)
      : await loadFromSource(filters);

    return NextResponse.json(payload);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error loading main view.";

    return NextResponse.json({ error: message }, { status: 502 });
  }
}
