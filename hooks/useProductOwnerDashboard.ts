/*
  Data hook for the Product Owner dashboard main view.

  Filters are part of the query key so each selected period, business unit, and
  project has an independent cached response. Channel is intentionally absent
  from the Product Owner request contract.
*/

import { useQuery } from "@tanstack/react-query";

import { productOwnerDashboardService } from "@/lib/services/productOwnerDashboardService";
import type { DashboardFilters } from "@/types/dashboard";

export function useDashboardProductOwnerMainView(
  filters: Omit<DashboardFilters, "channel"> = {},
) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["productOwnerDashboardMainView", filters],
    queryFn: () => productOwnerDashboardService.getMainView(filters),
    refetchOnWindowFocus: false,
  });

  return {
    mainViewData: data,
    isFetchingMainView: isLoading,
    isMainViewError: isError,
    mainViewError: error,
  };
}
