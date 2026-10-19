import { useQuery } from "@tanstack/react-query";

import {
  productOwnerDashboardService,
  type ProductOwnerFilters,
} from "@/lib/services/productOwnerDashboardService";
import type { ProductOwnerChartId } from "@/types/dashboardEndpointDtos";

export function useProductOwnerMetrics(filters: ProductOwnerFilters) {
  return useQuery({
    queryKey: ["product-owner", "metrics", filters],
    queryFn: () => productOwnerDashboardService.getMetrics(filters),
    refetchOnWindowFocus: false,
  });
}

export function useProductOwnerTimeseries(
  chartId: ProductOwnerChartId,
  filters: ProductOwnerFilters,
) {
  return useQuery({
    queryKey: ["product-owner", "timeseries", chartId, filters],
    queryFn: () => productOwnerDashboardService.getTimeseries(chartId, filters),
    refetchOnWindowFocus: false,
  });
}

/** Main-view composition: three independent requests, no combined API payload. */
export function useProductOwnerMainView(filters: ProductOwnerFilters) {
  const metrics = useProductOwnerMetrics(filters);
  const adoption = useProductOwnerTimeseries("adoption-and-engagement", filters);
  const quality = useProductOwnerTimeseries("experience-and-response-quality", filters);

  return { metrics, adoption, quality };
}
