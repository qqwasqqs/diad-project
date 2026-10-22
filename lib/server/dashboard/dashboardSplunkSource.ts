import type {
  MetricsRequestDto,
  MetricsResponseDto,
  TimeseriesRequestDto,
  TimeseriesResponseDto,
} from "@/types/dashboardEndpointDtos";

const MISSING_FUNCTION_CONTRACT = [
  "approved saved-search names and routing for each metrics request and chartId",
  "Azure Function argument names for timeRange, businessUnits, projects, and timezone",
  "Azure Function encoding rules for array-valued businessUnits and projects",
  "confirmation that the Function forwards those arguments to saved-search placeholders",
  "approved result fields for the metrics and timeseries response DTOs",
].join("; ");

export class DashboardSplunkContractError extends Error {
  constructor(endpoint: "metrics" | "timeseries") {
    super(
      `Cannot call Splunk for dashboard ${endpoint}: the dashboard saved-search/Function contract is missing ${MISSING_FUNCTION_CONTRACT}.`,
    );
    this.name = "DashboardSplunkContractError";
  }
}

const METRICS_SAVED_SEARCH = "| savedsearch consolidated_metric_final";
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

// Stage 1 connectivity test: logs the raw response and returns no metrics; filters and mapping come in stage 2.
export async function loadSplunkMetrics(
  request: MetricsRequestDto,
): Promise<MetricsResponseDto> {
  // Dynamic import: keyvault.ts throws on load without KEY_VAULT_URL, which would break mock mode.
  const { fetchSplunkReport } = await import("@/lib/services/splunkReportService");

  const end = new Date();
  const start = new Date(end.getTime() - THIRTY_DAYS_MS);

  const raw = await fetchSplunkReport.postSplunkQuery(
    METRICS_SAVED_SEARCH,
    start.toISOString(),
    end.toISOString(),
  );

  console.log("[dashboard] Splunk metrics raw response:", JSON.stringify(raw, null, 2));

  return {
    meta: {
      dashboard: "product-owner",
      requestId: crypto.randomUUID(),
      generatedAt: end.toISOString(),
      appliedFilters: {
        timeRange: request.filters.timeRange.value,
        businessUnits: [...request.filters.businessUnits],
        projects: [...request.filters.projects],
        timezone: request.filters.timezone,
      },
    },
    metrics: [],
  };
}

export async function loadSplunkTimeseries(
  request: TimeseriesRequestDto,
): Promise<TimeseriesResponseDto> {
  // Dynamic import: keyvault.ts throws on load without KEY_VAULT_URL, which would break mock mode.
  const { fetchSplunkReport } = await import("@/lib/services/splunkReportService");

  const end = new Date();
  const start = new Date(end.getTime() - THIRTY_DAYS_MS);

  const raw = await fetchSplunkReport.postSplunkQuery(
    METRICS_SAVED_SEARCH,
    start.toISOString(),
    end.toISOString(),
  );

  console.log("[dashboard] Splunk timeseries raw response:", JSON.stringify(raw, null, 2));

  return {
    meta: {
      dashboard: "product-owner",
      requestId: crypto.randomUUID(),
      generatedAt: end.toISOString(),
      appliedFilters: {
        timeRange: request.filters.timeRange.value,
        businessUnits: [...request.filters.businessUnits],
        projects: [...request.filters.projects],
        timezone: request.filters.timezone,
      },
      chartId: request.chartId,
      granularity: request.granularity,
    },
    series: [],
    supportingStats: [],
  };
}
