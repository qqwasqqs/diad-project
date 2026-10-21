/* Pure response pass-throughs. No network calls and no React dependencies. */

import type {
  TechTeamDashboardMetricsPayload,
  TechTeamDashboardTimeseriesPayload,
} from "@/types/techTeamDashboard";

export function adaptTechTeamMetrics(
  response: TechTeamDashboardMetricsPayload,
): TechTeamDashboardMetricsPayload {
  return response;
}

export function adaptTechTeamTimeseries(
  response: TechTeamDashboardTimeseriesPayload,
): TechTeamDashboardTimeseriesPayload {
  return response;
}
