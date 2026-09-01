/*
  Operations Team main-view endpoint.

  This route is the single seam between the dashboard and its data source. The
  page, its hook, and its service all speak `OperationsDashboardPayload`, so
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
  formatRow,
  readFilters,
  scopeFactor,
  sliceSeries,
  type MockMetricRow,
} from "@/lib/dashboard/mockSource";
import type { DashboardFilters, Series } from "@/types/dashboard";
import type { OperationsDashboardPayload } from "@/types/operationsDashboard";

const MOCK_PATH = path.join(
  process.cwd(),
  "public",
  "mocks",
  "new-pages",
  "operations-team-dashboard.json",
);

/*
  Shape of the mock file: numeric amounts and a full 90-day range, because the
  mock is a source to be filtered and formatted rather than a ready-made
  response. Mapping it onto the public contract is this route's job, exactly as
  mapping a Splunk report would be.
*/
interface MockPayload {
  operationalSituation: MockMetricRow[];
  requestedOperationsCoverage: MockMetricRow[];
  servicePathStability: {
    latencySeries: Series[];
    diagnostics: MockMetricRow[];
  };
  failureSurface: OperationsDashboardPayload["failureSurface"];
  operationalControlCoverage: MockMetricRow[];
  safetyAndSecurityReadiness: MockMetricRow[];
}

/*
  Applies the selected scope to the mock.

  Deliberately more permissive than a real source may be: every metric here
  responds to every filter, because the mock exists to exercise the UI. See
  `attributionRule` in lib/dashboard/mockSource for what the real source must do
  instead, and the note on `loadFromSource` below.
*/
function applyFilters(
  mock: MockPayload,
  filters: DashboardFilters,
): OperationsDashboardPayload {
  const factor = scopeFactor(filters);
  const format = (rows: MockMetricRow[]) =>
    rows.map((row) => formatRow(row, factor));

  return {
    operationalSituation: format(mock.operationalSituation),
    // Every entry here is a pending state, so the scope cannot change it.
    requestedOperationsCoverage: format(mock.requestedOperationsCoverage),
    servicePathStability: {
      latencySeries: sliceSeries(mock.servicePathStability.latencySeries, filters),
      diagnostics: format(mock.servicePathStability.diagnostics),
    },
    failureSurface: {
      ...mock.failureSurface,
      items: mock.failureSurface.items.map((item) => ({
        ...item,
        value: Number((item.value * factor).toFixed(2)),
      })),
    },
    operationalControlCoverage: format(mock.operationalControlCoverage),
    safetyAndSecurityReadiness: format(mock.safetyAndSecurityReadiness),
  };
}

async function loadMockPayload(
  filters: DashboardFilters,
): Promise<OperationsDashboardPayload> {
  const file = await fs.readFile(MOCK_PATH, "utf-8");
  return applyFilters(JSON.parse(file) as MockPayload, filters);
}

/*
  Replace this with the approved source call.

  The implementation must return `OperationsDashboardPayload` with the selected
  filters already applied, per metric, following the attribution rule documented
  in lib/dashboard/mockSource: filter where attribution is approved, and return
  `pendingState: "filter-breakdown"` where it is not.

  Do not copy the mock's behaviour of scoping everything unconditionally. It is
  a UI fixture, not a model of what the source is allowed to claim.
*/
async function loadFromSource(
  filters: DashboardFilters,
): Promise<OperationsDashboardPayload> {
  void filters;

  throw new Error(
    "Operations Team main-view source is not configured. Supply the approved " +
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
