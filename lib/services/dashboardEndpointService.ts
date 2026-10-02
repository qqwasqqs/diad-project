/*
  Shared browser-to-Next.js transport for the dashboard endpoints.

  It owns the two HTTP calls and nothing else: no filter conversion, no metric
  selection, no model adaptation. Those are per-dashboard concerns and live in
  each dashboard's own endpoint service.

  The response type parameter lets a caller name the response it expects. It is
  a convenience for the call site, not a guarantee: what actually arrives is
  unverified until that dashboard's adapter has checked it.
*/

import apiClient from "@/lib/apiClient";
import type {
  MetricsRequestDto,
  MetricsResponseDto,
  TimeseriesRequestDto,
  TimeseriesResponseDto,
} from "@/types/dashboardEndpointDtos";

export const dashboardEndpointService = {
  async getMetrics<Response extends MetricsResponseDto = MetricsResponseDto>(
    request: MetricsRequestDto,
  ): Promise<Response> {
    const { data } = await apiClient.post<Response>(
      "/api/dashboard/metrics",
      request,
    );

    return data;
  },

  async getTimeseries<
    Response extends TimeseriesResponseDto = TimeseriesResponseDto,
  >(request: TimeseriesRequestDto): Promise<Response> {
    const { data } = await apiClient.post<Response>(
      "/api/dashboard/timeseries",
      request,
    );

    return data;
  },
};
