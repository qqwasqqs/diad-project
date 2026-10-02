/*
  Local fixture provider for the Product Owner endpoints.

  It exists so the page can be developed and reviewed without Splunk. Its
  scaling and slicing are illustrative UI behavior, not definitions for the
  future saved searches: every response it returns carries
  `meta.illustrative: true`.

  Request validation is not done here. It belongs to the route boundary and
  lives in `dashboardRequestParsers.ts`, so the rules are the same whichever
  source answers.
*/

import { promises as fs } from "fs";
import path from "path";

import { periodDays, scopeFactor, shiftBounded } from "@/lib/dashboard/mockSource";
import type { DashboardFilters, Series } from "@/types/dashboard";
import type {
  DashboardEndpointFiltersDto,
  DashboardEndpointMetaDto,
  ProductOwnerMetricsRequestDto,
  ProductOwnerMetricsResponseDto,
  ProductOwnerTimeseriesRequestDto,
  ProductOwnerTimeseriesResponseDto,
  SupportingStatDto,
} from "@/types/dashboardEndpointDtos";

const MOCK_DIRECTORY = path.join(process.cwd(), "public", "mocks", "new-pages");

interface MockStat {
  id: string;
  amount?: number;
  max?: number;
  pendingState?: string;
}

interface MockMain {
  productExperiencePulse: {
    sessionQueryVolume: {
      queries: number;
      sessions: number;
      queriesPerSession: number;
    };
    endToEndLatency: { seconds: number };
    workflowCompletion: { reason: string };
  };
  adoptionAndEngagement: { series: Series[]; supporting: MockStat[] };
  experienceAndResponseQuality: { series: Series[]; supporting: MockStat[] };
}

async function readMock<T>(name: string): Promise<T> {
  const contents = await fs.readFile(path.join(MOCK_DIRECTORY, name), "utf8");
  return JSON.parse(contents) as T;
}

export function toMockFilters(
  filters: DashboardEndpointFiltersDto,
): DashboardFilters {
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

export function illustrativeMeta<Dashboard extends DashboardEndpointMetaDto["dashboard"]>(
  dashboard: Dashboard,
  filters: DashboardEndpointFiltersDto,
): DashboardEndpointMetaDto<Dashboard> {
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

export async function loadMockMetrics(
  request: ProductOwnerMetricsRequestDto,
): Promise<ProductOwnerMetricsResponseDto> {
  const main = await readMock<MockMain>("product-owner-dashboard.json");
  const factor = scopeFactor(toMockFilters(request.filters));
  const available = {
    "session-query-volume": {
      metricId: "session-query-volume",
      status: "OK",
      value: {
        queries: Math.round(main.productExperiencePulse.sessionQueryVolume.queries * factor),
        sessions: Math.round(main.productExperiencePulse.sessionQueryVolume.sessions * factor),
        queriesPerSession: main.productExperiencePulse.sessionQueryVolume.queriesPerSession,
      },
    },
    "api-error-rate": {
      metricId: "api-error-rate",
      status: "CALCULATION_PENDING",
      value: null,
      reason: "Error classification and eligible-request rules are not approved",
    },
    "end-to-end-latency-p95": {
      metricId: "end-to-end-latency-p95",
      status: "OK",
      value: {
        latencyMs: Math.round(main.productExperiencePulse.endToEndLatency.seconds * factor * 1000),
      },
    },
    "workflow-completion": {
      metricId: "workflow-completion",
      status: "DATA_PENDING",
      value: null,
      reason: main.productExperiencePulse.workflowCompletion.reason,
    },
  } as const;

  return {
    meta: illustrativeMeta("product-owner", request.filters),
    metrics: request.metrics.map((id) => available[id]),
  };
}

export async function loadMockTimeseries(
  request: ProductOwnerTimeseriesRequestDto,
): Promise<ProductOwnerTimeseriesResponseDto> {
  const main = await readMock<MockMain>("product-owner-dashboard.json");
  const filters = toMockFilters(request.filters);
  const factor = scopeFactor(filters);
  const days = periodDays(filters);
  const source =
    request.chartId === "adoption-and-engagement"
      ? main.adoptionAndEngagement
      : main.experienceAndResponseQuality;
  const bounded = request.chartId === "experience-and-response-quality";
  const series = source.series
    .filter((item) => request.metrics.includes(item.id))
    .map((item) =>
      item.id === "intent-resolution"
        ? {
            metricId: item.id,
            status: "CALCULATION_PENDING" as const,
            points: [] as [],
            reason: "Score scale and direction are not approved",
          }
        : {
            metricId: item.id,
            status: "OK" as const,
            points: item.points.slice(-days).map((point) => ({
              x: point.x,
              y: Number(
                (bounded ? shiftBounded(point.y, 5, factor) : point.y * factor).toFixed(2),
              ),
            })),
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
      : {
          metricId: item.id,
          status: "OK",
          value: Number(
            (item.id === "queries-per-session"
              ? item.amount
              : item.max !== undefined
                ? shiftBounded(item.amount, item.max, factor)
                : item.amount * factor
            ).toFixed(2),
          ),
        },
  );

  return {
    meta: {
      ...illustrativeMeta("product-owner", request.filters),
      chartId: request.chartId,
      granularity: "day",
    },
    series,
    supportingStats,
  };
}
