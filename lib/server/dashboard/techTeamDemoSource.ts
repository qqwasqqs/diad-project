/*
  Local fixture provider for the Technical Teams endpoints.

  It reads the same fixture the legacy combined main-view route reads, so local
  development keeps the numbers it already had, and maps it onto the shared
  endpoint DTOs.

  Two translations happen here, and both belong to a source rather than to the
  page:

  1. The fixture's own identifiers are mapped to the approved metric IDs from
     the Technical Teams Splunk data contract. The contract is the authority on
     what a metric is called on the wire; the fixture predates it.
  2. The fixture's `pendingState` vocabulary (`definition`, `formula`,
     `calculation`, `data`, `test-results`) is mapped to the endpoint
     availability statuses, with the specific reason preserved as text. The
     endpoint vocabulary is deliberately smaller, so the reason carries what the
     status cannot.

  Everything returned here is illustrative and says so in `meta`.
*/

import { promises as fs } from "fs";
import path from "path";

import { periodDays, scopeFactor, shiftBounded } from "@/lib/dashboard/mockSource";
import {
  illustrativeMeta,
  toMockFilters,
} from "@/lib/server/dashboard/productOwnerDemoSource";
import type { PendingState, Series } from "@/types/dashboard";
import type {
  DashboardAvailabilityStatus,
  MetricResultDto,
  SeriesResultDto,
  SupportingStatDto,
  TechTeamMetricId,
  TechTeamMetricsRequestDto,
  TechTeamMetricsResponseDto,
  TechTeamTimeseriesRequestDto,
  TechTeamTimeseriesResponseDto,
} from "@/types/dashboardEndpointDtos";

const MOCK_PATH = path.join(
  process.cwd(),
  "public",
  "mocks",
  "new-pages",
  "tech-team-dashboard.json",
);

interface MockRow {
  id: string;
  label: string;
  amount?: number;
  unit?: string;
  prefix?: string;
  decimals?: number;
  max?: number;
  pendingState?: PendingState;
}

interface MockPayload {
  requestPathHealth: { latencySeries: Series[]; diagnostics: MockRow[] };
  failureLocalization: { scaleMax: number; items: { label: string; value: number }[] };
  capacityAndEfficiency: MockRow[];
  aiModelQuality: { series: Series[]; supporting: MockRow[] };
  evaluatorReadiness: MockRow[];
}

/*
  Fixture row ID to approved metric ID. The fixture's abbreviations
  (`pipeline-duration`, `pii-leakage`) are not the contract's names, and the
  wire uses the contract's.
*/
const METRIC_ID_BY_MOCK_ID: Record<string, TechTeamMetricId> = {
  "request-throughput": "request-throughput",
  "inference-error-rate": "inference-error-rate",
  "pipeline-duration": "pipeline-duration-average",
  "indexing-ai-services": "indexing-ai-services-latency-average",
  "cost-per-request": "cost-per-request",
  "token-usage-request": "token-usage-per-request",
  "token-throughput": "token-throughput",
  "available-token-limit": "available-token-limit",
  "cache-hit-ratio": "cache-hit-ratio",
  "safety-evaluation-score": "safety-evaluation-score",
  "mlflow-safety-score": "mlflow-safety-score",
  "pii-leakage": "pii-leakage-agent-only",
  upia: "upia",
};

/*
  The eight Failure Localization bars in fixture order. The fixture carries only
  labels, because the chart compares them visually; the wire needs the metric ID
  that owns each denominator.
*/
const FAILURE_RATE_IDS: TechTeamMetricId[] = [
  "failure-rate-pipeline",
  "failure-rate-job",
  "failure-rate-inference",
  "failure-rate-api-service",
  "failure-rate-training",
  "failure-rate-indexing",
  "failure-rate-transcription",
  "failure-rate-translation",
];

const PENDING_STATUS: Record<PendingState, Exclude<DashboardAvailabilityStatus, "OK">> = {
  data: "DATA_PENDING",
  definition: "CALCULATION_PENDING",
  formula: "CALCULATION_PENDING",
  calculation: "CALCULATION_PENDING",
  "test-results": "CALCULATION_PENDING",
  scale: "CALCULATION_PENDING",
  threshold: "CALCULATION_PENDING",
  "filter-breakdown": "FILTER_BREAKDOWN_UNAVAILABLE",
  "evaluator-coverage": "DATA_PENDING",
  "no-data": "NO_DATA",
  unavailable: "ERROR",
};

const PENDING_REASON: Record<PendingState, string> = {
  data: "No approved source data for this measure",
  definition: "No selected source or definition is approved",
  formula: "Competing formulas; one has not been approved",
  calculation: "The combined measure is not approved",
  "test-results": "Test-case taxonomy and results are not approved",
  scale: "Score scale and direction are not approved",
  threshold: "No approved threshold",
  "filter-breakdown": "The selected scope cannot be reliably attributed",
  "evaluator-coverage": "Evaluator coverage is not approved",
  "no-data": "No eligible records in the selected scope",
  unavailable: "The source could not return this measure",
};

const SERIES_ID_BY_MOCK_ID: Record<string, string> = {
  "end-to-end-p95": "end-to-end-p95",
  "model-response-avg": "model-response-average",
  "retrieval-avg": "retrieval-average",
  "tool-call-avg": "tool-call-average",
  groundedness: "groundedness",
  "response-coherence": "response-coherence",
  "relevance-quality": "relevance-quality",
};

async function readMock(): Promise<MockPayload> {
  return JSON.parse(await fs.readFile(MOCK_PATH, "utf8")) as MockPayload;
}

function pending(
  metricId: TechTeamMetricId,
  state: PendingState,
): MetricResultDto<TechTeamMetricId> {
  return {
    metricId,
    status: PENDING_STATUS[state],
    value: null,
    reason: PENDING_REASON[state],
  };
}

/*
  Scales a fixture amount for the selected scope. A bounded score shifts within
  its scale rather than multiplying, so an illustrative scope cannot drive a
  quality or safety rating to a perfect one.
*/
function scaled(row: MockRow, factor: number): number {
  const amount = row.amount ?? 0;
  const value =
    row.max !== undefined ? shiftBounded(amount, row.max, factor) : amount * factor;

  return Number(value.toFixed(row.decimals ?? 2));
}

/* The value object each metric ID carries when it is `OK`. */
function metricValue(
  metricId: TechTeamMetricId,
  row: MockRow,
  factor: number,
): Record<string, unknown> {
  const amount = scaled(row, factor);

  switch (metricId) {
    case "request-throughput":
      return { throughputRequestsPerSecond: amount };
    case "inference-error-rate":
      return { errorRatePercent: amount };
    case "pipeline-duration-average":
      // The fixture states seconds; the contract normalizes durations to ms.
      return { averageDurationMs: Math.round(amount * 1000) };
    case "indexing-ai-services-latency-average":
      return { averageLatencyMs: Math.round(amount) };
    case "cost-per-request":
      return { averageCostPerRequest: amount, currencyCode: "USD" };
    case "token-usage-per-request":
      // The fixture states thousands of tokens.
      return { averageTokensPerRequest: Math.round(amount * 1000) };
    case "mlflow-safety-score":
      return { mlflowSafetyScore: amount, scaleMax: row.max ?? 1 };
    default:
      return { value: amount };
  }
}

function adaptRow(row: MockRow, factor: number): MetricResultDto<TechTeamMetricId> {
  const metricId = METRIC_ID_BY_MOCK_ID[row.id];

  if (!metricId) {
    throw new Error(`Fixture row has no approved metric ID: ${row.id}`);
  }

  if (row.pendingState || row.amount === undefined) {
    return pending(metricId, row.pendingState ?? "data");
  }

  return { metricId, status: "OK", value: metricValue(metricId, row, factor) };
}

export async function loadTechTeamMockMetrics(
  request: TechTeamMetricsRequestDto,
): Promise<TechTeamMetricsResponseDto> {
  const mock = await readMock();
  const factor = scopeFactor(toMockFilters(request.filters));

  const rows = [
    ...mock.requestPathHealth.diagnostics,
    ...mock.capacityAndEfficiency,
    ...mock.evaluatorReadiness,
  ];

  const byMetricId = new Map<TechTeamMetricId, MetricResultDto<TechTeamMetricId>>(
    rows.map((row) => {
      const result = adaptRow(row, factor);
      return [result.metricId, result];
    }),
  );

  /*
    Each failure rate is its own metric with its own denominator, so the bars
    become eight independent results rather than one grouped value.
  */
  mock.failureLocalization.items.forEach((item, index) => {
    const metricId = FAILURE_RATE_IDS[index];

    if (metricId) {
      /*
        The rate only. The fixture's `scaleMax` is the bar track's bound, which
        is a presentation choice the chart makes; it is not an aggregate the
        source reports, so it does not travel on the wire.
      */
      byMetricId.set(metricId, {
        metricId,
        status: "OK",
        value: { failureRatePercent: Number((item.value * factor).toFixed(2)) },
      });
    }
  });

  return {
    meta: illustrativeMeta("tech-team", request.filters),
    metrics: request.metrics.map(
      (metricId) =>
        byMetricId.get(metricId) ?? {
          metricId,
          status: "NO_DATA" as const,
          value: null,
          reason: "The local fixture has no row for this metric",
        },
    ),
  };
}

export async function loadTechTeamMockTimeseries(
  request: TechTeamTimeseriesRequestDto,
): Promise<TechTeamTimeseriesResponseDto> {
  const mock = await readMock();
  const filters = toMockFilters(request.filters);
  const factor = scopeFactor(filters);
  const days = periodDays(filters);
  const isQuality = request.chartId === "ai-model-quality";
  const source = isQuality
    ? mock.aiModelQuality.series
    : mock.requestPathHealth.latencySeries;

  const series: SeriesResultDto[] = source.flatMap((item) => {
    const metricId = SERIES_ID_BY_MOCK_ID[item.id] ?? item.id;

    if (!request.metrics.includes(metricId)) {
      return [];
    }

    return [
      {
        metricId,
        status: "OK" as const,
        points: item.points.slice(-days).map((point) => ({
          x: point.x,
          // 1-5 evaluator scores are bounded; latencies in ms are not.
          y: Number(
            (isQuality
              ? shiftBounded(point.y, 5, factor)
              : point.y * factor
            ).toFixed(2),
          ),
        })),
      },
    ];
  });

  /*
    Only the quality chart has supporting stats. Retrieval Quality is a 1-5
    period value and MLflow Correctness a 0-1 one; they stay separate values and
    are never averaged onto the chart's axis.
  */
  const supportingStats: SupportingStatDto[] = isQuality
    ? mock.aiModelQuality.supporting.map((row) =>
        row.pendingState || row.amount === undefined
          ? {
              metricId: row.id,
              status: PENDING_STATUS[row.pendingState ?? "data"],
              value: null,
              reason: PENDING_REASON[row.pendingState ?? "data"],
            }
          : { metricId: row.id, status: "OK", value: scaled(row, factor) },
      )
    : [];

  return {
    meta: {
      ...illustrativeMeta("tech-team", request.filters),
      chartId: request.chartId,
      granularity: "day",
    },
    series,
    supportingStats,
  };
}
