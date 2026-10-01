import { NextRequest, NextResponse } from "next/server";

import { parseDashboardTimeseriesRequest } from "@/lib/server/dashboard/dashboardRequestParsers";
import { loadDashboardTimeseries } from "@/lib/server/dashboard/dashboardDataSource";
import { DashboardSplunkContractError } from "@/lib/server/dashboard/dashboardSplunkSource";
import { UnsupportedDashboardEnvironmentError } from "@/lib/localDesignMode";
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
    return NextResponse.json(await loadDashboardTimeseries(input));
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
