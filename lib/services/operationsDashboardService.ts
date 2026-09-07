import apiClient from "@/lib/apiClient";

import type { DashboardFilters } from "@/types/dashboard";
import type { OperationsDashboardPayload } from "@/types/operationsDashboard";

export const operationsDashboardService = {
  /*
    Main-view payload for the Operations Team dashboard.

    The endpoint owns the data source, so this wrapper stays unchanged when the
    route moves from local mock data to Splunk.
  */
  getMainView: async (
    filters: DashboardFilters = {},
  ): Promise<OperationsDashboardPayload> => {
    const res = await apiClient.get<OperationsDashboardPayload>(
      "/api/operations-team-dashboard/main-view",
      { params: filters },
    );

    return res.data;
  },
};
