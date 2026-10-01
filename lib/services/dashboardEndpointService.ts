import apiClient from "@/lib/apiClient";
import type {
  MetricsRequestDto,
  MetricsResponseDto,
  TimeseriesRequestDto,
  TimeseriesResponseDto,
} from "@/types/dashboardEndpointDtos";

export const dashboardEndpointService = {
  async getMetrics(request: MetricsRequestDto): Promise<MetricsResponseDto> {
    const { data } = await apiClient.post<MetricsResponseDto>(
      "/api/dashboard/metrics",
      request,
    );

    return data;
  },

  async getTimeseries(
    request: TimeseriesRequestDto,
  ): Promise<TimeseriesResponseDto> {
    const { data } = await apiClient.post<TimeseriesResponseDto>(
      "/api/dashboard/timeseries",
      request,
    );

    return data;
  },
};
