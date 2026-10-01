import {
  loadMockMetrics,
  loadMockTimeseries,
} from "@/lib/server/dashboard/productOwnerDemoSource";
import {
  loadSplunkMetrics,
  loadSplunkTimeseries,
} from "@/lib/server/dashboard/dashboardSplunkSource";
import type {
  MetricsRequestDto,
  MetricsResponseDto,
  TimeseriesRequestDto,
  TimeseriesResponseDto,
} from "@/types/dashboardEndpointDtos";

type DashboardDataSource = "mock" | "splunk";

// Splunk is the default in every environment; set DASHBOARD_DATA_SOURCE=mock to use local fixtures.
function getDashboardDataSource(): DashboardDataSource {
  const override = process.env.DASHBOARD_DATA_SOURCE?.trim().toLowerCase();

  if (!override || override === "splunk") {
    return "splunk";
  }

  if (override === "mock") {
    return "mock";
  }

  throw new Error(
    `Unsupported DASHBOARD_DATA_SOURCE value "${override}". Expected mock, splunk, or an empty value.`,
  );
}

export async function loadDashboardMetrics(
  request: MetricsRequestDto,
): Promise<MetricsResponseDto> {
  return getDashboardDataSource() === "mock"
    ? loadMockMetrics(request)
    : loadSplunkMetrics(request);
}

export async function loadDashboardTimeseries(
  request: TimeseriesRequestDto,
): Promise<TimeseriesResponseDto> {
  return getDashboardDataSource() === "mock"
    ? loadMockTimeseries(request)
    : loadSplunkTimeseries(request);
}
