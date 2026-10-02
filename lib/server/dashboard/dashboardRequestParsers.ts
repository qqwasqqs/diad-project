/*
  Route-facing validation for the shared dashboard endpoints.

  Why this is here and not in a provider: both routes validate before a data
  source is selected, so the rules cannot depend on which source answers. The
  earlier validation lived inside the Product Owner local provider and
  allow-listed the demo's own business units and projects, which rejected real
  deployed filters with HTTP 400 before the request ever reached Splunk. It was
  disabled rather than fixed. This module replaces it.

  What is validated here is the *contract*: the dashboard, its sections, its
  metric and chart identifiers, and the shape of the filters. What is not
  validated here is which business unit, project, or app values exist — those
  are data, served to the filter bar by `/api/dashboard/filters`, and a source
  that does not recognize a value answers with `NO_DATA`, not a 400.

  Filter values are still constrained in form. They travel toward saved-search
  arguments, so an unchecked value must never reach one: each is bounded in
  length and restricted to a conservative character set here, at the boundary.
*/

import type {
  DashboardEndpointFiltersDto,
  DashboardId,
  DashboardRelativeTimeRange,
  MetricsRequestDto,
  ProductOwnerChartId,
  ProductOwnerMetricId,
  ProductOwnerSectionId,
  TechTeamChartId,
  TechTeamMetricId,
  TechTeamSectionId,
  TimeseriesRequestDto,
} from "@/types/dashboardEndpointDtos";

const TIME_RANGES: DashboardRelativeTimeRange[] = [
  "last_7_days",
  "last_30_days",
  "last_90_days",
];

/*
  A filter value is an identifier chosen from the source's own distinct values,
  plus the literal `all`. Letters, digits, and separators are enough for that;
  quotes, wildcards, pipes, and whitespace runs are not, and are exactly what
  must not reach a search argument.
*/
const FILTER_VALUE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 ._:-]{0,63}$/;
const MAX_FILTER_VALUES = 50;

interface DashboardContract {
  sections: readonly string[];
  metrics: readonly string[];
  charts: Readonly<Record<string, readonly string[]>>;
}

/*
  The approved identifiers per dashboard, mirroring each dashboard's Splunk data
  contract. A metric absent here cannot be requested at all; a metric present
  here may still answer with a pending status.
*/
const DASHBOARD_CONTRACTS: Record<DashboardId, DashboardContract> = {
  "product-owner": {
    sections: ["product-experience-pulse"] satisfies ProductOwnerSectionId[],
    metrics: [
      "session-query-volume",
      "api-error-rate",
      "end-to-end-latency-p95",
      "workflow-completion",
    ] satisfies ProductOwnerMetricId[],
    charts: {
      "adoption-and-engagement": ["sessions", "queries"],
      "experience-and-response-quality": [
        "groundedness",
        "relevance-quality",
        "intent-resolution",
      ],
    } satisfies Record<ProductOwnerChartId, string[]>,
  },
  "tech-team": {
    sections: [
      "request-path-health",
      "failure-localization",
      "capacity-and-efficiency",
      "ai-model-quality",
      "evaluator-readiness",
    ] satisfies TechTeamSectionId[],
    metrics: [
      "request-throughput",
      "inference-error-rate",
      "pipeline-duration-average",
      "indexing-ai-services-latency-average",
      "failure-rate-pipeline",
      "failure-rate-job",
      "failure-rate-inference",
      "failure-rate-api-service",
      "failure-rate-training",
      "failure-rate-indexing",
      "failure-rate-transcription",
      "failure-rate-translation",
      "cost-per-request",
      "token-usage-per-request",
      "token-throughput",
      "available-token-limit",
      "cache-hit-ratio",
      "safety-evaluation-score",
      "mlflow-safety-score",
      "pii-leakage-agent-only",
      "upia",
    ] satisfies TechTeamMetricId[],
    charts: {
      "request-path-health": [
        "end-to-end-p95",
        "model-response-average",
        "retrieval-average",
        "tool-call-average",
      ],
      "ai-model-quality": [
        "groundedness",
        "response-coherence",
        "relevance-quality",
      ],
    } satisfies Record<TechTeamChartId, string[]>,
  },
};

export class DashboardRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DashboardRequestError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function fail(message: string): never {
  throw new DashboardRequestError(message);
}

function parseDashboard(value: unknown): DashboardId {
  if (value !== "product-owner" && value !== "tech-team") {
    fail(`Unsupported dashboard: ${String(value)}`);
  }

  return value;
}

function parseFilterValues(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    fail(`Invalid ${field}: expected a non-empty array`);
  }

  if (value.length > MAX_FILTER_VALUES) {
    fail(`Invalid ${field}: at most ${MAX_FILTER_VALUES} values are accepted`);
  }

  return value.map((entry) => {
    if (typeof entry !== "string" || !FILTER_VALUE_PATTERN.test(entry)) {
      fail(`Invalid ${field} value: ${String(entry)}`);
    }

    return entry;
  });
}

function parseFilters(value: unknown): DashboardEndpointFiltersDto {
  if (!isRecord(value) || !isRecord(value.timeRange)) {
    fail("Invalid dashboard filters");
  }

  const { timeRange } = value;

  if (timeRange.type !== "relative") {
    fail("Invalid timeRange: only relative ranges are supported");
  }

  if (!TIME_RANGES.includes(timeRange.value as DashboardRelativeTimeRange)) {
    fail(`Unsupported timeRange value: ${String(timeRange.value)}`);
  }

  if (value.timezone !== "UTC") {
    fail("Invalid timezone: only UTC is supported");
  }

  return {
    timeRange: {
      type: "relative",
      value: timeRange.value as DashboardRelativeTimeRange,
    },
    businessUnits: parseFilterValues(value.businessUnits, "businessUnits"),
    projects: parseFilterValues(value.projects, "projects"),
    /*
      `apps` is accepted as absent and defaulted to the unfiltered scope so a
      client that predates the dimension is not rejected. An explicitly supplied
      value is validated like any other.
    */
    apps:
      value.apps === undefined
        ? ["all"]
        : parseFilterValues(value.apps, "apps"),
    timezone: "UTC",
  };
}

function parseIdentifiers(
  value: unknown,
  approved: readonly string[],
  field: string,
): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    fail(`Invalid ${field}: expected a non-empty array`);
  }

  const unknownId = value.find(
    (entry) => typeof entry !== "string" || !approved.includes(entry),
  );

  if (unknownId !== undefined) {
    fail(`Unsupported ${field} identifier: ${String(unknownId)}`);
  }

  // Duplicates are a client mistake, not a reason to query twice.
  return [...new Set(value as string[])];
}

export function parseDashboardMetricsRequest(
  payload: unknown,
): MetricsRequestDto {
  if (!isRecord(payload)) {
    fail("Invalid metrics request");
  }

  const dashboard = parseDashboard(payload.dashboard);
  const contract = DASHBOARD_CONTRACTS[dashboard];

  return {
    dashboard,
    sections: parseIdentifiers(payload.sections, contract.sections, "section"),
    metrics: parseIdentifiers(payload.metrics, contract.metrics, "metric"),
    filters: parseFilters(payload.filters),
    options: { includePending: true, includeCoverage: true },
  } as MetricsRequestDto;
}

export function parseDashboardTimeseriesRequest(
  payload: unknown,
): TimeseriesRequestDto {
  if (!isRecord(payload)) {
    fail("Invalid timeseries request");
  }

  const dashboard = parseDashboard(payload.dashboard);
  const contract = DASHBOARD_CONTRACTS[dashboard];
  const chartId = payload.chartId;

  if (typeof chartId !== "string" || !(chartId in contract.charts)) {
    fail(`Unsupported ${dashboard} chartId: ${String(chartId)}`);
  }

  if (payload.granularity !== "day") {
    fail("Invalid granularity: only day is supported");
  }

  return {
    dashboard,
    chartId,
    metrics: parseIdentifiers(
      payload.metrics,
      contract.charts[chartId],
      "chart metric",
    ),
    filters: parseFilters(payload.filters),
    granularity: "day",
    options: { includeSupportingStats: true },
  } as TimeseriesRequestDto;
}
