/*
  Chooses which source answers a dashboard endpoint request.

  Two independent decisions meet here: which *source* (local fixtures or
  Splunk), and which *dashboard* asked. The source comes from configuration so
  a developer can work offline; the dashboard comes from the validated request,
  so each dashboard can migrate to Splunk on its own schedule without the other
  changing.

  Splunk responses are cached per user and request; see dashboardResponseCache.
  Local fixtures are not, so an edited fixture shows on the next request.
*/

import { cachedDashboardResponse } from "@/lib/server/dashboard/dashboardResponseCache";

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

/*
  `user` is the authenticated user's identifier. Without one the response is
  not cached, because an anonymous entry could be served to anyone.
*/
export async function loadDashboardMetrics(
  request: MetricsRequestDto,
  user?: string,
): Promise<
  | MetricsResponseDto
  | ProductOwnerDashboardMetricsPayload
  | TechTeamDashboardMetricsPayload
> {
  if (getDashboardDataSource() === "splunk") {
    return user
      ? cachedDashboardResponse(user, "metrics", request, () => loadSplunkMetrics(request))
      : loadSplunkMetrics(request);
  }

  return request.dashboard === "product-owner"
    ? loadMockMetrics(request)
    : loadTechTeamMockMetrics(request);
}

export async function loadDashboardTimeseries(
  request: TimeseriesRequestDto,
  user?: string,
): Promise<TimeseriesResponseDto> {
  if (getDashboardDataSource() === "splunk") {
    return user
      ? cachedDashboardResponse(user, "timeseries", request, () =>
          loadSplunkTimeseries(request),
        )
      : loadSplunkTimeseries(request);
  }

  return request.dashboard === "product-owner"
    ? loadMockTimeseries(request)
    : loadTechTeamMockTimeseries(request);
}
