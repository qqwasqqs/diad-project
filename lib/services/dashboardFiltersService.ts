/*
  API calls for the global dashboard filter bar.

  The bar's options are served by `/api/dashboard/filters`, which owns the data
  source, so this wrapper stays unchanged when that route moves from local mock
  data to Splunk.
*/

import apiClient from "../apiClient";

import type { DashboardFilterOptions } from "@/types/dashboard";

// Base endpoint for the shared dashboard contract paths.
const DASHBOARD_BASE_URL = "/api/dashboard";

export const dashboardFiltersService = {
  /*
    Selectable values for each data-derived filter dimension.
  */
  async getFilterOptions(): Promise<DashboardFilterOptions> {
    const response = await apiClient.get<DashboardFilterOptions>(
      `${DASHBOARD_BASE_URL}/filters`,
    );

    return response.data;
  },
};
