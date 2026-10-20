import apiClient from "@/lib/apiClient";

import type { DashboardFilters } from "@/types/dashboard";
import type { ProductOwnerDashboardPayload } from "@/types/productOwnerDashboard";

type ProductOwnerDashboardFilters = Omit<DashboardFilters, "channel">;

export const productOwnerDashboardService = {
  /*
    The endpoint owns the source and response mapping. Replacing the local mock
    with Splunk therefore does not change this service, the hook, or the page.
  */
  getMainView: async (
    filters: ProductOwnerDashboardFilters = {},
  ): Promise<ProductOwnerDashboardPayload> => {
    const response = await apiClient.get<ProductOwnerDashboardPayload>(
      "/api/product-owner-dashboard/main-view",
      { params: filters },
    );

    return response.data;
  },
};
