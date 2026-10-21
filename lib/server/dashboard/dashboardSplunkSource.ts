/*
  The deployed source boundary.

  No approved saved-search routing, filter binding, or result-field contract
  exists yet for either dashboard, so nothing here can produce a measured
  metric. What it can do — and the only reason the metrics path calls Splunk
  at all — is prove connectivity and print what the saved search actually
  returns, so each dashboard's mapper can be written against real fields.

  Two rules govern this file until those contracts arrive:

  1. A request is never answered with numbers it did not ask for. The
     connectivity probe runs one fixed saved search over a fixed window, so
     every requested metric comes back `FILTER_BREAKDOWN_UNAVAILABLE` rather
     than carrying a portfolio-wide figure into a filtered view.
  2. `meta.appliedFilters` states the scope that was actually applied, not the
     scope that was requested. Echoing the request back would make an
     unfiltered result look like a filtered one.
*/

import type {
  DashboardAppliedFiltersDto,
  DashboardId,
  MetricsRequestDto,
  MetricsResponseDto,
  TimeseriesRequestDto,
  TimeseriesResponseDto,
} from "@/types/dashboardEndpointDtos";

const MISSING_FUNCTION_CONTRACT = [
  "approved saved-search names and routing for each metrics request and chartId",
  "Azure Function argument names for timeRange, businessUnits, projects, apps, and timezone",
  "Azure Function encoding rules for array-valued businessUnits, projects, and apps",
  "confirmation that the Function forwards those arguments to saved-search placeholders",
  "approved result fields for the metrics and timeseries response DTOs",
].join("; ");

export class DashboardSplunkContractError extends Error {
  constructor(endpoint: "metrics" | "timeseries", dashboard: string) {
    super(
      `Cannot call Splunk for ${dashboard} ${endpoint}: the dashboard saved-search/Function contract is missing ${MISSING_FUNCTION_CONTRACT}.`,
    );
    this.name = "DashboardSplunkContractError";
  }
}

/*
  The saved search each dashboard's connectivity probe runs. No Technical Teams
  search is approved yet, so it runs the Product Owner one: the point of the
  probe is to prove the Function call and print the rows, not to map them.
*/
const METRICS_SAVED_SEARCH: Record<DashboardId, string> = {
  "product-owner": "| savedsearch consolidated_metric_final",
  "tech-team": "| savedsearch consolidated_metric_final",
};
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

const UNBOUND_FILTERS_REASON =
  "The connectivity probe runs one fixed saved search over a fixed 30-day, " +
  "portfolio-wide window. Requested filters are not yet bound to saved-search " +
  "arguments, so no scoped value can be reported.";

/*
  The scope the probe actually applies: the whole portfolio over the last 30
  days, in UTC. It is stated rather than inferred from the request.
*/
const PROBE_APPLIED_FILTERS: DashboardAppliedFiltersDto = {
  timeRange: "last_30_days",
  businessUnits: ["all"],
  projects: ["all"],
  apps: ["all"],
  timezone: "UTC",
};

// Stage 1 connectivity test: logs the raw response and reports every metric as unfiltered.
export async function loadSplunkMetrics(
  request: MetricsRequestDto,
): Promise<MetricsResponseDto> {
  // Dynamic import: keyvault.ts throws on load without KEY_VAULT_URL, which would break mock mode.
  const { fetchSplunkReport } = await import("@/lib/services/splunkReportService");

  const end = new Date();
  const start = new Date(end.getTime() - THIRTY_DAYS_MS);

  const raw = await fetchSplunkReport.postSplunkQuery(
    METRICS_SAVED_SEARCH[request.dashboard],
    start.toISOString(),
    end.toISOString(),
  );

  console.log(
    `[dashboard] Splunk ${request.dashboard} metrics raw response:`,
    JSON.stringify(raw, null, 2),
  );

  return {
    meta: {
      dashboard: request.dashboard,
      requestId: crypto.randomUUID(),
      generatedAt: end.toISOString(),
      appliedFilters: PROBE_APPLIED_FILTERS,
    },
    metrics: request.metrics.map((metricId) => ({
      metricId,
      status: "FILTER_BREAKDOWN_UNAVAILABLE" as const,
      value: null,
      reason: UNBOUND_FILTERS_REASON,
    })),
  };
}

export async function loadSplunkTimeseries(
  request: TimeseriesRequestDto,
): Promise<TimeseriesResponseDto> {
  throw new DashboardSplunkContractError("timeseries", request.dashboard);
}
