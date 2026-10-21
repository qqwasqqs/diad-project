/*
  Local fixture provider for the Technical Teams endpoints.

  Metrics are the fixture itself, returned unchanged: the page renders the
  fixture's shape, so there is nothing to map, filter, or recalculate. If a
  reviewer needs different numbers, change the fixture.

  Everything returned here is illustrative and says so in `meta`.
*/

import { promises as fs } from "fs";
import path from "path";

import { periodDays, scopeFactor, shiftBounded } from "@/lib/dashboard/mockSource";
import type { DashboardFilters, PendingState } from "@/types/dashboard";
import type {
  DashboardAvailabilityStatus,
  DashboardEndpointFiltersDto,
  DashboardEndpointMetaDto,
  SeriesResultDto,
  SupportingStatDto,
  TechTeamMetricsRequestDto,
  TechTeamTimeseriesRequestDto,
  TechTeamTimeseriesResponseDto,
} from "@/types/dashboardEndpointDtos";
import type {
  TechTeamDashboardMetricRow,
  TechTeamDashboardMetricsPayload,
} from "@/types/techTeamDashboard";

const MOCK_PATH = path.join(
  process.cwd(),
  "public",
  "mocks",
  "new-pages",
  "tech-team-dashboard.json",
);

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

function toMockFilters(filters: DashboardEndpointFiltersDto): DashboardFilters {
  const periods = {
    last_7_days: "7d",
    last_30_days: "30d",
    last_90_days: "90d",
  } as const;

  return {
    period: periods[filters.timeRange.value],
    businessUnit: filters.businessUnits[0],
    project: filters.projects[0],
    app: filters.apps[0],
  };
}

function illustrativeMeta(
  dashboard: "tech-team",
  filters: DashboardEndpointFiltersDto,
): DashboardEndpointMetaDto<"tech-team"> {
  return {
    dashboard,
    requestId: crypto.randomUUID(),
    generatedAt: new Date().toISOString(),
    appliedFilters: {
      timeRange: filters.timeRange.value,
      businessUnits: [...filters.businessUnits],
      projects: [...filters.projects],
      apps: [...filters.apps],
      timezone: filters.timezone,
    },
    illustrative: true,
  };
}

async function readMock(): Promise<TechTeamDashboardMetricsPayload> {
  return JSON.parse(
    await fs.readFile(MOCK_PATH, "utf8"),
  ) as TechTeamDashboardMetricsPayload;
}

/*
  Scales a fixture amount for the selected scope. A bounded score shifts within
  its scale rather than multiplying, so an illustrative scope cannot drive a
  quality or safety rating to a perfect one.
*/
function scaled(row: TechTeamDashboardMetricRow, factor: number): number {
  const amount = row.amount ?? 0;
  const value =
    row.max !== undefined ? shiftBounded(amount, row.max, factor) : amount * factor;

  return Number(value.toFixed(row.decimals ?? 2));
}

export async function loadTechTeamMockMetrics(
  request: TechTeamMetricsRequestDto,
): Promise<TechTeamDashboardMetricsPayload> {
  void request;
  return readMock();
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
