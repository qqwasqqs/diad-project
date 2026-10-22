import {
  loadMockMetrics,
  loadMockTimeseries,
} from "@/lib/server/dashboard/productOwnerDemoSource";
import {
  loadTechTeamMockMetrics,
  loadTechTeamMockTimeseries,
} from "@/lib/server/dashboard/techTeamDemoSource";
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
import type { ProductOwnerDashboardMetricsPayload } from "@/types/productOwnerDashboard";
import type { TechTeamDashboardMetricsPayload } from "@/types/techTeamDashboard";

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
): Promise<
  | MetricsResponseDto
  | ProductOwnerDashboardMetricsPayload
  | TechTeamDashboardMetricsPayload
> {
  if (getDashboardDataSource() === "splunk") {
    return loadSplunkMetrics(request);
  }

  return request.dashboard === "product-owner"
    ? loadMockMetrics(request)
    : loadTechTeamMockMetrics(request);
}

export async function loadDashboardTimeseries(
  request: TimeseriesRequestDto,
): Promise<TimeseriesResponseDto> {
  if (getDashboardDataSource() === "splunk") {
    return loadSplunkTimeseries(request);
  }

  return request.dashboard === "product-owner"
    ? loadMockTimeseries(request)
    : loadTechTeamMockTimeseries(request);
}
