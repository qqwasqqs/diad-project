import apiClient from "@/lib/apiClient";

export const techTeamDashboardService = {
   getSummary: async () => {
      const res = await apiClient.get(
         "/api/tech-team-dashboard/summary"
      );

      return res.data;
   }
};