import { NextRequest, NextResponse } from "next/server";

import { parseDashboardMetricsRequest } from "@/lib/server/dashboard/dashboardRequestParsers";
import { loadDashboardMetrics } from "@/lib/server/dashboard/dashboardDataSource";
import { DashboardSplunkContractError } from "@/lib/server/dashboard/dashboardSplunkSource";
import { UnsupportedDashboardEnvironmentError } from "@/lib/localDesignMode";
import type { MetricsRequestDto } from "@/types/dashboardEndpointDtos";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let input: MetricsRequestDto;

  try {
    input = parseDashboardMetricsRequest(await request.json());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid metrics request" },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json(await loadDashboardMetrics(input));
  } catch (error) {
    const status =
      error instanceof DashboardSplunkContractError
        ? 501
        : error instanceof UnsupportedDashboardEnvironmentError
          ? 500
          : 502;

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load metrics" },
      { status },
    );
  }
}
