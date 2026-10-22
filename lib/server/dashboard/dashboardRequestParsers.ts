import type {
  MetricsRequestDto,
  TimeseriesRequestDto,
} from "@/types/dashboardEndpointDtos";

/*
  TECH DEBT — request validation is temporarily disabled for every dashboard.
  The parsers pass input through unchanged. The earlier validation, still
  commented out in productOwnerDemoSource.ts, allow-listed the local demo's
  filters and rejected real ones with HTTP 400. It belongs here, shared by
  every dashboard and source, with environment-appropriate allowlists.
*/

export function parseDashboardMetricsRequest(payload: unknown): MetricsRequestDto {
  return payload as MetricsRequestDto;
}

export function parseDashboardTimeseriesRequest(
  payload: unknown,
): TimeseriesRequestDto {
  return payload as TimeseriesRequestDto;
}
