import type {
  MetricsRequestDto,
  MetricsResponseDto,
  TimeseriesRequestDto,
  TimeseriesResponseDto,
} from "@/types/dashboardEndpointDtos";

import { fetchSplunkReport } from "@/lib/services/splunkReportService";

export class DashboardSplunkContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DashboardSplunkContractError";
  }
}

/*
  This is the server-only boundary for saved-search selection, Splunk calls,
  raw-response logging, and the later DTO mapping stage.

  The existing Azure Function report client (`fetchSplunkReport.getReport`) is
  currently wired to pass only `saved_search_name`.

  For now we use it only to verify connectivity and log the raw response. We do
  not implement field mapping in this stage.

  Filters are still validated and recorded in the response metadata, but they
  are not forwarded to Splunk until the Function argument contract is confirmed.
*/
function requireSavedSearch(name: string, envKey: string): string {
  if (!name.trim()) {
    throw new DashboardSplunkContractError(
      `Missing dashboard saved-search configuration: set ${envKey} to an approved Splunk saved search name for this endpoint.`,
    );
  }

  return name.trim();
}

function buildAppliedFilters(request: MetricsRequestDto | TimeseriesRequestDto) {
  return {
    timeRange: request.filters.timeRange.value,
    businessUnits: request.filters.businessUnits,
    projects: request.filters.projects,
    timezone: request.filters.timezone,
  };
}

function buildResponseMeta(request: MetricsRequestDto | TimeseriesRequestDto) {
  return {
    dashboard: request.dashboard,
    requestId: crypto.randomUUID(),
    generatedAt: new Date().toISOString(),
    appliedFilters: buildAppliedFilters(request),
  };
}

function metricsSavedSearch(request: MetricsRequestDto): string {
  if (request.dashboard !== "product-owner") {
    throw new DashboardSplunkContractError(
      `No saved-search routing configured for dashboard "${request.dashboard}" metrics request.`,
    );
  }

  return requireSavedSearch(
    process.env.PRODUCT_OWNER_DASHBOARD_METRICS_SAVED_SEARCH_NAME ?? "",
    "PRODUCT_OWNER_DASHBOARD_METRICS_SAVED_SEARCH_NAME",
  );
}

function timeseriesSavedSearch(request: TimeseriesRequestDto): string {
  if (request.dashboard !== "product-owner") {
    throw new DashboardSplunkContractError(
      `No saved-search routing configured for dashboard "${request.dashboard}" timeseries request.`,
    );
  }

  const chartId = request.chartId;
  const envKey =
    chartId === "adoption-and-engagement"
      ? "PRODUCT_OWNER_DASHBOARD_TIMESERIES_SAVED_SEARCH_NAME_ADOPTION_AND_ENGAGEMENT"
      : "PRODUCT_OWNER_DASHBOARD_TIMESERIES_SAVED_SEARCH_NAME_EXPERIENCE_AND_RESPONSE_QUALITY";

  const value = process.env[envKey] ?? "";
  return requireSavedSearch(value, envKey);
}

function logSplunkResponse(context: {
  endpoint: "metrics" | "timeseries";
  savedSearchName: string;
  request: MetricsRequestDto | TimeseriesRequestDto;
  results: unknown;
}) {
  try {
    // Log only the existence/shape of the response to confirm connectivity.
    const preview =
      Array.isArray(context.results) && context.results.length > 0
        ? (context.results[0] as unknown)
        : context.results;

    console.log("[Dashboard Splunk Raw Response]", {
      endpoint: context.endpoint,
      dashboard: context.request.dashboard,
      chartId: "chartId" in context.request ? context.request.chartId : undefined,
      savedSearchName: context.savedSearchName,
      requestedFilters: context.request.filters,
      resultCount: Array.isArray(context.results) ? context.results.length : undefined,
      firstRow: preview,
    });
  } catch (error) {
    console.warn("[Dashboard Splunk Raw Response] failed to log", error);
  }
}

export async function loadSplunkMetrics(
  request: MetricsRequestDto,
): Promise<MetricsResponseDto> {
  const savedSearchName = metricsSavedSearch(request);
  const results = await fetchSplunkReport.getReport(savedSearchName);
  logSplunkResponse({ endpoint: "metrics", savedSearchName, request, results });

  return {
    meta: buildResponseMeta(request),
    metrics: request.metrics.map((metricId) => ({
      metricId,
      status: "ERROR",
      value: null,
      reason:
        "Splunk connection verified and raw response logged. Field mapping is not implemented yet.",
    })),
  };
}

export async function loadSplunkTimeseries(
  request: TimeseriesRequestDto,
): Promise<TimeseriesResponseDto> {
  const savedSearchName = timeseriesSavedSearch(request);
  const results = await fetchSplunkReport.getReport(savedSearchName);
  logSplunkResponse({ endpoint: "timeseries", savedSearchName, request, results });

  return {
    meta: {
      ...buildResponseMeta(request),
      chartId: request.chartId,
      granularity: request.granularity,
    },
    series: request.metrics.map((metricId) => ({
      metricId,
      status: "ERROR",
      points: [],
      reason:
        "Splunk connection verified and raw response logged. Field mapping is not implemented yet.",
    })),
    supportingStats: [],
  };
}
