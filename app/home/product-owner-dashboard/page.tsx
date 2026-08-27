"use client";

import DashboardPage from "@/components/shared/dashboard/DashboardPage";
import DashboardGrid from "@/components/shared/dashboard/DashboardGrid";
import DashboardLineChart from "@/components/shared/dashboard/DashboardLineChart";
import DashboardPanel from "@/components/shared/dashboard/DashboardPanel";

export default function ProductOwnerDashboard() {
  return (
    <DashboardPage
      title="AI Observability — Product Owner Dashboard"
      description="Understand adoption, user experience, and business value"
    >
      <DashboardGrid>
        <DashboardPanel template="single" title="Shared Panel - single region">
          <div className="text-sm text-slate-700">
            This is a generic shared panel container used as a structural test.
          </div>
        </DashboardPanel>

        <DashboardPanel
          template="segmented"
          title="Shared Panel - segmented"
          sections={[
            { id: "left", title: "Primary" },
            { id: "middle", title: "Secondary" },
            { id: "right", title: "Tertiary" },
          ]}
        >
          <div className="text-sm text-slate-700">Region one</div>
          <div className="text-sm text-slate-700">Region two</div>
          <div className="text-sm text-slate-700">Region three</div>
        </DashboardPanel>

        <DashboardPanel template="single" title="Session & Query Volume">
          <DashboardLineChart
            description="Session Length / Query per session"
            height={320}
            series={[
              {
                id: "sessions",
                label: "Sessions",
                color: "#3b82f6",
                yAxis: "left",
                points: [
                  { x: "Apr 20", y: 15000 },
                  { x: "Apr 21", y: 14000 },
                  { x: "Apr 22", y: 18000 },
                  { x: "Apr 23", y: 21000 },
                  { x: "Apr 24", y: 22000 },
                  { x: "Apr 25", y: 24000 },
                  { x: "Apr 26", y: 26000 },
                  { x: "Apr 27", y: 28000 },
                  { x: "Apr 28", y: 25000 },
                  { x: "Apr 29", y: 30000 },
                  { x: "Apr 30", y: 27000 },
                  { x: "May 1", y: 29000 },
                  { x: "May 2", y: 32000 },
                  { x: "May 3", y: 30000 },
                  { x: "May 4", y: 33000 },
                  { x: "May 5", y: 31000 },
                ],
              },
              {
                id: "queries",
                label: "Queries",
                color: "#8b5cf6",
                yAxis: "right",
                points: [
                  { x: "Apr 20", y: 12000 },
                  { x: "Apr 21", y: 16000 },
                  { x: "Apr 22", y: 19000 },
                  { x: "Apr 23", y: 20000 },
                  { x: "Apr 24", y: 24000 },
                  { x: "Apr 25", y: 26000 },
                  { x: "Apr 26", y: 28000 },
                  { x: "Apr 27", y: 30000 },
                  { x: "Apr 28", y: 34000 },
                  { x: "Apr 29", y: 36000 },
                  { x: "Apr 30", y: 39000 },
                  { x: "May 1", y: 42000 },
                  { x: "May 2", y: 43000 },
                  { x: "May 3", y: 47000 },
                  { x: "May 4", y: 50000 },
                  { x: "May 5", y: 52000 },
                ],
              },
            ]}
            axes={[
              {
                id: "left",
                tickFormatter: (value) => `${Math.round(value / 1000)}K`,
              },
              {
                id: "right",
                tickFormatter: (value) => `${Math.round(value / 1000)}K`,
              },
            ]}
            supportingStats={[
              {
                id: "queries-per-session",
                icon: <span aria-hidden="true">👥</span>,
                value: "4.6",
                text: "queries/session",
              },
              {
                id: "avg-session",
                icon: <span aria-hidden="true">⏱</span>,
                value: "8.2 min",
                text: "avg session",
              },
            ]}
          />
        </DashboardPanel>

      </DashboardGrid>
    </DashboardPage>
  );
}
