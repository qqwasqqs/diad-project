/*
  Chooses which source answers a dashboard endpoint request.

  Two independent decisions meet here: which *source* (local fixtures or
  Splunk), and which *dashboard* asked. The source comes from configuration so
  a developer can work offline; the dashboard comes from the validated request,
  so each dashboard can migrate to Splunk on its own schedule without the other
  changing.
*/

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
