import { NextRequest, NextResponse } from "next/server";

import { parseDashboardTimeseriesRequest } from "@/lib/server/dashboard/dashboardRequestParsers";
import { loadDashboardTimeseries } from "@/lib/server/dashboard/dashboardDataSource";
import { DashboardSplunkContractError } from "@/lib/server/dashboard/dashboardSplunkSource";
import { UnsupportedDashboardEnvironmentError } from "@/lib/localDesignMode";
import { getAuthenticatedPrincipal, getPrincipalAuditId } from "@/lib/rbac/identity";
import type { TimeseriesRequestDto } from "@/types/dashboardEndpointDtos";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let input: TimeseriesRequestDto;

  try {
    input = parseDashboardTimeseriesRequest(await request.json());
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Invalid timeseries request",
      },
      { status: 400 },
    );
  }

  try {
    // Scopes the response cache to this user; no identity means no caching.
    const principal = getAuthenticatedPrincipal(request);
    const user = principal ? getPrincipalAuditId(principal) : undefined;

    return NextResponse.json(await loadDashboardTimeseries(input, user));
  } catch (error) {
    const status =
      error instanceof DashboardSplunkContractError
        ? 501
        : error instanceof UnsupportedDashboardEnvironmentError
          ? 500
          : 502;

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load timeseries" },
      { status },
    );
  }
}
