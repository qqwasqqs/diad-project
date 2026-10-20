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
