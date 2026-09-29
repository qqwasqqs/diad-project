import { getDashboardRuntimeEnvironment } from "@/lib/localDesignMode";
import {
  loadMockMetrics,
  loadMockTimeseries,
} from "@/lib/server/dashboard/productOwnerDemoSource";
import {
  loadSplunkMetrics,
  loadSplunkTimeseries,
} from "@/lib/server/dashboard/dashboardSplunkSource";
import type {
  MetricsRequestDto,
  MetricsResponseDto,
  TimeseriesRequestDto,
  TimeseriesResponseDto,
} from "@/types/dashboardEndpointDtos";

export async function loadDashboardMetrics(
  request: MetricsRequestDto,
): Promise<MetricsResponseDto> {
  return getDashboardRuntimeEnvironment() === "local"
    ? loadMockMetrics(request)
    : loadSplunkMetrics(request);
}

export async function loadDashboardTimeseries(
  request: TimeseriesRequestDto,
): Promise<TimeseriesResponseDto> {
  return getDashboardRuntimeEnvironment() === "local"
    ? loadMockTimeseries(request)
    : loadSplunkTimeseries(request);
}
