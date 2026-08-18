"use client";
import DashboardPage from "@/components/shared/dashboard/DashboardPage";
import  DashboardGrid  from "@/components/shared/dashboard/DashboardGrid";
import  DashboardSection  from "@/components/shared/dashboard/DashboardSection";

export default function TechTeamDashboard() {
  return (
    <DashboardPage
      title="AI Observability — Executive Dashboard"
      description="Diagnose request paths, failures, evaluator quality, and capacity"
    >
      <DashboardGrid>

        <DashboardSection>
          <p>RequestPathHealth</p>
        </DashboardSection>

        <DashboardSection>
       {/*    <ThroughputMetrics /> */}
        </DashboardSection>

        <DashboardSection>
          {/* <FailureLocalization /> */}
        </DashboardSection>

        <DashboardSection>
          {/* <CapacityEfficiency /> */}
        </DashboardSection>

        <DashboardSection className="xl:col-span-2">
          {/* <AIModelQuality /> */}
        </DashboardSection>

      </DashboardGrid>
    </DashboardPage>
  );
}