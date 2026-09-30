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
import {
  formatAmount,
  formatRow,
  readFilters,
  scopeFactor,
  sliceSeries,
  type MockAmount,
  type MockMetricRow,
} from "@/lib/dashboard/mockSource";
import type {
  ContextRow,
  DashboardFilters,
  DrawerContent,
  Series,
} from "@/types/dashboard";
import type { TechTeamDashboardPayload } from "@/types/techTeamDashboard";

const MOCK_PATH = path.join(
  process.cwd(),
  "public",
  "mocks",
  "new-pages",
  "tech-team-dashboard.json",
);

/*
  A drawer's provenance rows quote the same metrics the main view shows, so they
  carry amounts here too rather than finished strings. A drawer that printed the
  mock's portfolio-wide string while a narrower scope was selected would
  contradict the panel behind it — and its own filter row.
*/
type MockContextRow = Omit<ContextRow, "latest"> & MockAmount;

interface MockDrawerContent extends Omit<DrawerContent, "contextRows"> {
  contextRows: MockContextRow[];
}

type MockDrawers = Record<keyof TechTeamDashboardPayload["drawers"], MockDrawerContent>;

/*
  Shape of the mock file: numeric amounts and a full 90-day range, because the
  mock is a source to be filtered and formatted rather than a ready-made
  response. Mapping it onto the public contract is this route's job, exactly as
  mapping a Splunk report would be.
*/
interface MockPayload
  extends Omit<
    TechTeamDashboardPayload,
    | "requestPathHealth"
    | "capacityAndEfficiency"
    | "aiModelQuality"
    | "evaluatorReadiness"
    | "drawers"
  > {
  drawers: MockDrawers;
  requestPathHealth: {
    latencySeries: Series[];
    diagnostics: MockMetricRow[];
  };
  capacityAndEfficiency: MockMetricRow[];
  aiModelQuality: {
    series: Series[];
    supporting: (MockMetricRow & { label: string })[];
  };
  evaluatorReadiness: MockMetricRow[];
}

/*
  Applies the selected scope to the mock.

  Deliberately more permissive than a real source may be: every metric here
  responds to every filter, because the mock exists to exercise the UI. See
  `attributionRule` in lib/dashboard/mockSource for what the real source must do
  instead, and the note on `loadFromSource` below.
*/
/*
  Resolves a drawer's provenance rows for the selected scope.

  `latest` is built from the same helper the main-view rows use, so a metric
  shown in both places reads the same in both. A row with no amount keeps its
  coverage state and simply has no latest value.
*/
function scopeDrawer(drawer: MockDrawerContent, factor: number): DrawerContent {
  return {
    ...drawer,
    contextRows: drawer.contextRows.map(
      ({ amount, unit, prefix, decimals, max, ...row }): ContextRow => ({
        ...row,
        latest: formatAmount({ amount, unit, prefix, decimals, max }, factor),
      }),
    ),
  };
}

function applyFilters(
  mock: MockPayload,
  filters: DashboardFilters,
): TechTeamDashboardPayload {
  const factor = scopeFactor(filters);

  return {
    ...mock,
    requestPathHealth: {
      latencySeries: sliceSeries(mock.requestPathHealth.latencySeries, filters),
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
      // Quality scores are bounded by their scale, so they shift rather than scale.
      series: sliceSeries(mock.aiModelQuality.series, filters, 5),
      supporting: mock.aiModelQuality.supporting.map((row) => ({
        id: row.id,
        label: row.label,
        value: formatRow(row, factor).value ?? "",
      })),
    },
    evaluatorReadiness: mock.evaluatorReadiness.map((row) =>
      formatRow(row, factor),
    ),

    /*
      Drawer prose — provenance, decisions, notes — passes through unscoped, but
      the numbers inside it do not. The drawers carry their own filter row, so a
      selection made there has to move the values the drawer is showing.
    */
    drawers: {
      latencyChart: scopeDrawer(mock.drawers.latencyChart, factor),
      diagnostics: scopeDrawer(mock.drawers.diagnostics, factor),
      failureLocalization: scopeDrawer(mock.drawers.failureLocalization, factor),
      capacityAndEfficiency: scopeDrawer(
        mock.drawers.capacityAndEfficiency,
        factor,
      ),
      aiModelQuality: scopeDrawer(mock.drawers.aiModelQuality, factor),
      evaluatorReadiness: scopeDrawer(mock.drawers.evaluatorReadiness, factor),
    },
  };
}

async function loadMockPayload(
  filters: DashboardFilters,
): Promise<TechTeamDashboardPayload> {
  const file = await fs.readFile(MOCK_PATH, "utf-8");
  return applyFilters(JSON.parse(file) as MockPayload, filters);
}

/*
  Replace this with the approved source call.

  The implementation must return `TechTeamDashboardPayload` with the selected
  filters already applied, per metric, following the attribution rule documented
  in lib/dashboard/mockSource: filter where attribution is approved, and return
  `pendingState: "filter-breakdown"` where it is not.

  Do not copy the mock's behaviour of scoping everything unconditionally. It is
  a UI fixture, not a model of what the source is allowed to claim.

  Suggested shape once the contract exists:

    const report = await splunkReportService.getTechTeamMainView(filters);
    return mapSplunkReportToPayload(report);
*/
async function loadFromSource(
  filters: DashboardFilters,
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
