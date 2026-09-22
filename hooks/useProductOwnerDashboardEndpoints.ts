import { useQuery } from "@tanstack/react-query";

import {
  productOwnerDashboardEndpointService,
  type ProductOwnerFilters,
} from "@/lib/services/productOwnerDashboardEndpointService";
import type { ProductOwnerChartId } from "@/types/dashboardEndpointDtos";

export function useProductOwnerMetrics(filters: ProductOwnerFilters) {
  return useQuery({
    queryKey: ["product-owner", "metrics", filters],
    queryFn: () => productOwnerDashboardEndpointService.getMetrics(filters),
    refetchOnWindowFocus: false,
  });
}

export function useProductOwnerTimeseries(
  chartId: ProductOwnerChartId,
  filters: ProductOwnerFilters,
) {
  return useQuery({
    queryKey: ["product-owner", "timeseries", chartId, filters],
    queryFn: () => productOwnerDashboardEndpointService.getTimeseries(chartId, filters),
    refetchOnWindowFocus: false,
  });
}

/** Page-level composition: three independent requests, no combined API payload. */
export function useProductOwnerDashboardEndpointDemo(filters: ProductOwnerFilters) {
  const metrics = useProductOwnerMetrics(filters);
  const adoption = useProductOwnerTimeseries("adoption-and-engagement", filters);
  const quality = useProductOwnerTimeseries("experience-and-response-quality", filters);

  return { metrics, adoption, quality };
}
