/*
  Converts the filter bar's selection into the endpoint filter DTO.

  Every dashboard converts the same way — the bar is shared and the request
  contract is shared — so the conversion is defined once. What stays per
  dashboard is which metrics and charts are asked for, not how a scope is
  expressed.

  Each dimension defaults to `all`, the unfiltered scope, so an absent
  dimension is an explicit "no narrowing" on the wire rather than a silent
  omission the source has to guess about.
*/

import type { DashboardFilters } from "@/types/dashboard";
import type {
  DashboardEndpointFiltersDto,
  DashboardRelativeTimeRange,
} from "@/types/dashboardEndpointDtos";

const TIME_RANGE_BY_PERIOD: Record<string, DashboardRelativeTimeRange> = {
  "7d": "last_7_days",
  "30d": "last_30_days",
  "90d": "last_90_days",
};

export const DEFAULT_PERIOD = "30d";
const UNFILTERED = "all";

export function toEndpointFilters(
  filters: DashboardFilters,
): DashboardEndpointFiltersDto {
  const period = filters.period ?? DEFAULT_PERIOD;
  const timeRange = TIME_RANGE_BY_PERIOD[period];

  if (!timeRange) {
    throw new Error(`Unsupported dashboard period: ${period}`);
  }

  return {
    timeRange: { type: "relative", value: timeRange },
    businessUnits: [filters.businessUnit ?? UNFILTERED],
    projects: [filters.project ?? UNFILTERED],
    apps: [filters.app ?? UNFILTERED],
    timezone: "UTC",
  };
}
