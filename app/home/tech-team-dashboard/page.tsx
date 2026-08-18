"use client";
import { useState } from "react";

import DashboardPage from "@/components/shared/dashboard/DashboardPage";
import DashboardGrid from "@/components/shared/dashboard/DashboardGrid";
import DashboardSection from "@/components/shared/dashboard/DashboardSection";
import DashboardSectionAction from "@/components/shared/dashboard/DashboardSectionAction";
import DashboardDrawer from "@/components/shared/dashboard/DashboardDrawer";
import DashboardKpiCard from "@/components/shared/dashboard/DashboardKpiCard";
import DashboardKpiGrid from "@/components/shared/dashboard/DashboardKpiGrid";

export default function TechTeamDashboard() {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);
  const [costOpen, setCostOpen] = useState(false);
  return (
    <DashboardPage
      title="AI Observability — Technical Teams Dashboard"
      description="Diagnose request paths, failures, evaluator quality, and capacity"
    >
      <DashboardGrid>
        <DashboardSection
          title="Executive pulse"
          actions={
            <DashboardSectionAction
              onClick={() => setDetailsOpen(true)}
            />
          }
        >
          <DashboardKpiGrid>
            <DashboardKpiCard
              label="End-to-End Latency"
              value="P95 1.20 s"
            />
            <DashboardKpiCard
              label="API Error Rate"
              value="1.14%"
            />
            <DashboardKpiCard
              label="Session & Query Volume"
              value="316K"
            />
            <DashboardKpiCard
              label="User Feedback"
              value="84%"
            />
          </DashboardKpiGrid>
        </DashboardSection>
        <DashboardSection
          title="Executive pulse"
          actions={
            <DashboardSectionAction
              onClick={() => setDetailsOpen(true)}
              label="View executive pulse details"
            />
          }
        >
          {/* KPI cards */}
        </DashboardSection>

        <DashboardSection title="Session & Query Volume"
          actions={
            <DashboardSectionAction
              onClick={() => setModelOpen(true)}
              label="View executive pulse details"
            />
          }
        >
          {/* Charts */}
        </DashboardSection>
        <DashboardSection title="Cost "
          actions={
            <DashboardSectionAction
              onClick={() => setCostOpen(true)}
              label="View executive pulse details"
            />
          }
        >
          {/* Charts */}
        </DashboardSection>

        <DashboardDrawer
          open={detailsOpen}
          title="Executive pulse"
          onClose={() => setDetailsOpen(false)}
        >
          {/* Drawer-specific content */}
        </DashboardDrawer>
        <DashboardDrawer
          open={modelOpen}
          title="Model performance"
          onClose={() => setModelOpen(false)}
        >
          <p>aaaa</p>
        </DashboardDrawer>
        <DashboardDrawer
          open={costOpen}
          title="Cost details"
          onClose={() => setCostOpen(false)}
        >
          <p>aaaa</p>

        </DashboardDrawer>

      </DashboardGrid>
    </DashboardPage>
  );
}