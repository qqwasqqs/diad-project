/*
  Technical Teams main-view endpoint.

  This route is the single seam between the dashboard and its data source. The
  page, its hook, and its service all speak `TechTeamDashboardPayload`, so
  moving from local mock data to Splunk (or any approved API) means replacing
  `loadFromSource` below and changing nothing else.

  In local design mode the payload is read from the static mock so the page can
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
} from "@/types/techTeamDashboard";

const MOCK_PATH = path.join(
  process.cwd(),
  "public",
  "mocks",
  "new-pages",
  "tech-team-dashboard.json",
);

function readFilters(request: NextRequest): TechTeamDashboardFilters {
  const params = request.nextUrl.searchParams;

  return {
    period: params.get("period") ?? undefined,
    businessUnit: params.get("businessUnit") ?? undefined,
    project: params.get("project") ?? undefined,
    channel: params.get("channel") ?? undefined,
  };
}

async function loadMockPayload(): Promise<TechTeamDashboardPayload> {
  const file = await fs.readFile(MOCK_PATH, "utf-8");
  return JSON.parse(file) as TechTeamDashboardPayload;
}

/*
  Replace this with the approved source call.

  The implementation must return `TechTeamDashboardPayload` with the selected
  filters already applied. Where a metric's attribution is not approved for a
  selected scope, return that row with `pendingState: "filter-breakdown"`
  instead of an unfiltered portfolio value.

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
      ? await loadMockPayload()
      : await loadFromSource(filters);

    return NextResponse.json(payload);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error loading main view.";

    return NextResponse.json({ error: message }, { status: 502 });
  }
}
