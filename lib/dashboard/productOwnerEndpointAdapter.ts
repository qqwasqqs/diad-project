/* Pure response pass-throughs. No network calls and no React dependencies. */

import type {
  ProductOwnerDashboardMetricsPayload,
  ProductOwnerDashboardTimeseriesPayload,
} from "@/types/productOwnerDashboard";

export function adaptProductOwnerMetrics(
  response: ProductOwnerDashboardMetricsPayload,
): ProductOwnerDashboardMetricsPayload {
  return response;
}

export function adaptProductOwnerTimeseries(
  response: ProductOwnerDashboardTimeseriesPayload,
): ProductOwnerDashboardTimeseriesPayload {
  return response;
}
