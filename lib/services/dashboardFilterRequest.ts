/* Converts the filter bar's selection into the endpoint filter DTO. Shared by
   every dashboard; only the metrics and charts requested are per dashboard. */

import type { DashboardFilters } from "@/types/dashboard";
import type { DashboardEndpointFiltersDto } from "@/types/dashboardEndpointDtos";

export function toEndpointFilters(
  filters: Pick<DashboardFilters, "period" | "businessUnit" | "project">,
): DashboardEndpointFiltersDto {
  const periods: Record<string, DashboardEndpointFiltersDto["timeRange"]["value"]> = {
    "7d": "last_7_days",
    "30d": "last_30_days",
    "90d": "last_90_days",
  };
  const period = filters.period ?? "30d";
  if (!(period in periods)) {
    throw new Error(`Unsupported dashboard period: ${period}`);
  }
  return {
    timeRange: { type: "relative", value: periods[period] },
    businessUnits: [filters.businessUnit ?? "all"],
    projects: [filters.project ?? "all"],
    timezone: "UTC",
  };
}
