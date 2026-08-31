import apiClient from "@/lib/apiClient";

import type {
   TechTeamDashboardFilters,
   TechTeamDashboardPayload,
} from "@/types/techTeamDashboard";

export const techTeamDashboardService = {
   /*
     Main-view payload for the Technical Teams dashboard.

     The endpoint owns the data source, so this wrapper stays unchanged when the
     route moves from local mock data to Splunk.
   */
   getMainView: async (
      filters: TechTeamDashboardFilters = {},
   ): Promise<TechTeamDashboardPayload> => {
      const res = await apiClient.get<TechTeamDashboardPayload>(
         "/api/tech-team-dashboard/main-view",
         { params: filters }
      );

      return res.data;
   }
};
