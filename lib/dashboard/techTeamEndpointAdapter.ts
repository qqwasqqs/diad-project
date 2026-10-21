/*
  Technical Teams response pass-throughs. No network calls and no React
  dependencies.

  The page renders the payloads as the source returns them. The functions are
  kept as named seams so a future Splunk-shaped response has an obvious place
  to be normalised.
*/

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
