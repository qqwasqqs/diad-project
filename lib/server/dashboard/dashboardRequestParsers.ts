import { parseMetricsRequest, parseTimeseriesRequest } from "@/lib/server/dashboard/productOwnerDemoSource";
import type {
  MetricsRequestDto,
  TimeseriesRequestDto,
} from "@/types/dashboardEndpointDtos";

export function parseDashboardMetricsRequest(payload: unknown): MetricsRequestDto {
  return parseMetricsRequest(payload);
}

export function parseDashboardTimeseriesRequest(
  payload: unknown,
): TimeseriesRequestDto {
  return parseTimeseriesRequest(payload);
}

