import { NextRequest, NextResponse } from "next/server";

import {
  loadMockTimeseries,
  parseTimeseriesRequest,
} from "@/lib/server/dashboard/productOwnerDemoSource";
import { isLocalDesignModeServer } from "@/lib/localDesignMode";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!isLocalDesignModeServer()) {
    return NextResponse.json(
      { error: "Splunk timeseries source is not configured in this MVP" },
      { status: 501 },
    );
  }
  try {
    const input = parseTimeseriesRequest(await request.json());
    return NextResponse.json(await loadMockTimeseries(input));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid timeseries request" },
      { status: 400 },
    );
  }
}
