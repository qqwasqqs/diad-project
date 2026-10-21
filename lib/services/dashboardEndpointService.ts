/*
  Shared browser-to-Next.js transport for the dashboard endpoints.

  It owns the two HTTP calls and nothing else: no filter conversion, no metric
  selection, no response shaping. Those are per-dashboard concerns and live in
  each dashboard's own endpoint service.

  The response type parameter lets each dashboard name its own payload type
  without the transport knowing anything about it.
*/

import apiClient from "@/lib/apiClient";
import type {
  MetricsRequestDto,
  MetricsResponseDto,
  TimeseriesRequestDto,
  TimeseriesResponseDto,
} from "@/types/dashboardEndpointDtos";

export const dashboardEndpointService = {
  async getMetrics<Response = MetricsResponseDto>(
    request: MetricsRequestDto,
  ): Promise<Response> {
    const { data } = await apiClient.post<Response>(
      "/api/dashboard/metrics",
      request,
    );

    return data;
  },

  async getTimeseries<Response = TimeseriesResponseDto>(
    request: TimeseriesRequestDto,
  ): Promise<Response> {
    const { data } = await apiClient.post<Response>(
      "/api/dashboard/timeseries",
      request,
    );

    return data;
  },
};
