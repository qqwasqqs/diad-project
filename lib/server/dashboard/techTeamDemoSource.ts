/*
  Local fixture provider for the Technical Teams endpoints.

  It reads the fixture and returns it. It does not filter, scale, slice, or
  recalculate: if a reviewer needs different numbers, change the fixture.

  Everything returned here is illustrative and says so in `meta`.
*/

import { promises as fs } from "fs";
import path from "path";

import type {
  DashboardEndpointFiltersDto,
  DashboardEndpointMetaDto,
  SupportingStatDto,
  TechTeamMetricsRequestDto,
  TechTeamTimeseriesRequestDto,
  TechTeamTimeseriesResponseDto,
} from "@/types/dashboardEndpointDtos";
import type { TechTeamDashboardMetricsPayload } from "@/types/techTeamDashboard";

const MOCK_PATH = path.join(
  process.cwd(),
  "public",
  "mocks",
  "new-pages",
  "tech-team-dashboard.json",
);

async function readMock(): Promise<TechTeamDashboardMetricsPayload> {
  return JSON.parse(
    await fs.readFile(MOCK_PATH, "utf8"),
  ) as TechTeamDashboardMetricsPayload;
}

function meta(
  filters: DashboardEndpointFiltersDto,
): DashboardEndpointMetaDto<"tech-team"> {
  return {
    dashboard: "tech-team",
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

export async function loadTechTeamMockMetrics(
  request: TechTeamMetricsRequestDto,
): Promise<TechTeamDashboardMetricsPayload> {
  void request;
  return readMock();
}

export async function loadTechTeamMockTimeseries(
  request: TechTeamTimeseriesRequestDto,
): Promise<TechTeamTimeseriesResponseDto> {
  const main = await readMock();
  // Only the quality chart has supporting stats.
  const source =
    request.chartId === "ai-model-quality"
      ? main.aiModelQuality
      : { series: main.requestPathHealth.latencySeries, supporting: [] };
  const series = source.series.map((item) =>
    item.points.length === 0
      ? {
          metricId: item.id,
          status: "CALCULATION_PENDING" as const,
          points: [] as [],
          reason: "Score scale and direction are not approved",
        }
      : {
          metricId: item.id,
          status: "OK" as const,
          points: item.points.map((point) => ({ x: point.x, y: point.y })),
        },
  );
  const supportingStats: SupportingStatDto[] = source.supporting.map((item) =>
    item.amount === undefined || item.pendingState
      ? {
          metricId: item.id,
          status: "DATA_PENDING",
          value: null,
          reason: item.pendingState ?? "No approved value",
        }
      : { metricId: item.id, status: "OK", value: item.amount },
  );
  return {
    meta: { ...meta(request.filters), chartId: request.chartId, granularity: "day" },
    series,
    supportingStats,
  };
}
