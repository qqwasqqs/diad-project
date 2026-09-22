import { NextRequest, NextResponse } from "next/server";

import {
  loadMockMetrics,
  parseMetricsRequest,
} from "@/lib/server/dashboard/productOwnerDemoSource";
import { isLocalDesignModeServer } from "@/lib/localDesignMode";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!isLocalDesignModeServer()) {
    return NextResponse.json(
      { error: "Splunk metrics source is not configured in this MVP" },
      { status: 501 },
    );
  }
  try {
    const input = parseMetricsRequest(await request.json());
    return NextResponse.json(await loadMockMetrics(input));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid metrics request" },
      { status: 400 },
    );
  }
}
