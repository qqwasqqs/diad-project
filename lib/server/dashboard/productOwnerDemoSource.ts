/* Local provider for the planned endpoints. Replace this provider with an
   approved Splunk integration; keep the route DTOs and client adapters. */

import { promises as fs } from "fs";
import path from "path";

import {
  mockFilterOptions,
} from "@/lib/dashboard/filterOptionsSource";
import { periodDays, scopeFactor, shiftBounded } from "@/lib/dashboard/mockSource";
import type { DashboardFilters, Series } from "@/types/dashboard";
import type {
  DashboardEndpointFiltersDto,
  DashboardEndpointMetaDto,
  MetricsRequestDto,
  MetricsResponseDto,
  ProductOwnerChartId,
  ProductOwnerMetricId,
  SupportingStatDto,
  TimeseriesRequestDto,
  TimeseriesResponseDto,
} from "@/types/dashboardEndpointDtos";

const MOCK_DIRECTORY = path.join(process.cwd(), "public", "mocks", "new-pages");
const METRIC_IDS: ProductOwnerMetricId[] = [
  "session-query-volume",
  "api-error-rate",
  "end-to-end-latency-p95",
  "workflow-completion",
];
const CHART_METRICS: Record<ProductOwnerChartId, string[]> = {
  "adoption-and-engagement": ["sessions", "queries"],
  "experience-and-response-quality": [
    "groundedness",
    "relevance-quality",
    "intent-resolution",
  ],
};

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseFilters(value: unknown): DashboardEndpointFiltersDto {
  if (!isRecord(value) || !isRecord(value.timeRange)) {
    throw new Error("Invalid dashboard filters");
  }
  const timeRange = value.timeRange;
  if (
    timeRange.type !== "relative" ||
    !["last_7_days", "last_30_days", "last_90_days"].includes(
      String(timeRange.value),
    ) ||
    value.timezone !== "UTC" ||
    !Array.isArray(value.businessUnits) ||
    !Array.isArray(value.projects) ||
    value.businessUnits.length !== 1 ||
    value.projects.length !== 1
  ) {
    throw new Error("Unsupported dashboard filters in local demo");
  }
  const businessUnit = value.businessUnits[0];
  const project = value.projects[0];
  const options = mockFilterOptions();
  if (
    typeof businessUnit !== "string" ||
    typeof project !== "string" ||
    !options.businessUnit.some((item) => item.value === businessUnit) ||
    !options.project.some((item) => item.value === project)
  ) {
    throw new Error("Unknown business unit or project in local demo");
  }
  return {
    timeRange: {
      type: "relative",
      value: timeRange.value as DashboardEndpointFiltersDto["timeRange"]["value"],
    },
    businessUnits: [businessUnit],
    projects: [project],
    timezone: "UTC",
  };
}

export function parseMetricsRequest(value: unknown): MetricsRequestDto {
  if (
    !isRecord(value) ||
    value.dashboard !== "product-owner" ||
    !Array.isArray(value.sections) ||
    value.sections.length !== 1 ||
    value.sections[0] !== "product-experience-pulse" ||
    !Array.isArray(value.metrics) ||
    value.metrics.length === 0 ||
    !value.metrics.every((id) => METRIC_IDS.includes(id))
  ) {
    throw new Error("Invalid Product Owner metrics request");
  }
  return {
    dashboard: "product-owner",
    sections: ["product-experience-pulse"],
    metrics: [...new Set(value.metrics)] as ProductOwnerMetricId[],
    filters: parseFilters(value.filters),
    options: { includePending: true, includeCoverage: true },
  };
}

export function parseTimeseriesRequest(value: unknown): TimeseriesRequestDto {
  if (
    !isRecord(value) ||
    value.dashboard !== "product-owner" ||
    (value.chartId !== "adoption-and-engagement" &&
      value.chartId !== "experience-and-response-quality") ||
    value.granularity !== "day" ||
    !Array.isArray(value.metrics) ||
    value.metrics.length === 0 ||
    !value.metrics.every((id) => CHART_METRICS[value.chartId as ProductOwnerChartId].includes(id))
  ) {
    throw new Error("Invalid Product Owner timeseries request");
  }
  return {
    dashboard: "product-owner",
    chartId: value.chartId as ProductOwnerChartId,
    metrics: [...new Set(value.metrics)] as string[],
    filters: parseFilters(value.filters),
    granularity: "day",
    options: { includeSupportingStats: true },
  };
}

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
  };
}

function meta(filters: DashboardEndpointFiltersDto): DashboardEndpointMetaDto {
  return {
    dashboard: "product-owner",
    requestId: crypto.randomUUID(),
    generatedAt: new Date().toISOString(),
    appliedFilters: {
      timeRange: filters.timeRange.value,
      businessUnits: [...filters.businessUnits],
      projects: [...filters.projects],
      timezone: filters.timezone,
    },
    illustrative: true,
  };
}

export async function loadMockMetrics(
  request: MetricsRequestDto,
): Promise<MetricsResponseDto> {
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
    meta: meta(request.filters),
    metrics: request.metrics.map((id) => available[id]),
  };
}

export async function loadMockTimeseries(
  request: TimeseriesRequestDto,
): Promise<TimeseriesResponseDto> {
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
    meta: { ...meta(request.filters), chartId: request.chartId, granularity: "day" },
    series,
    supportingStats,
  };
}
