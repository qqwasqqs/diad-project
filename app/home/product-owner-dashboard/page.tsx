"use client";
import { useState } from "react";

import DashboardPage from "@/components/shared/dashboard/DashboardPage";
import DashboardGrid from "@/components/shared/dashboard/DashboardGrid";
import DashboardSection from "@/components/shared/dashboard/DashboardSection";
import DashboardSectionAction from "@/components/shared/dashboard/DashboardSectionAction";
import DashboardDrawer from "@/components/shared/dashboard/DashboardDrawer";
import DashboardKpiCard from "@/components/shared/dashboard/DashboardKpiCard";
import DashboardKpiGrid from "@/components/shared/dashboard/DashboardKpiGrid";
import DashboardPanel from "@/components/shared/dashboard/DashboardPanel";

export default function ProductOwnerDashboard() {
  const [pulseOpen, setPulseOpen] = useState(false);
  const [engagementOpen, setEngagementOpen] = useState(false);
  const [channelOpen, setChannelOpen] = useState(false);
  const [trustOpen, setTrustOpen] = useState(false);

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

        {/* <DashboardSection
          title="Product experience pulse"
          actions={
            <DashboardSectionAction
              onClick={() => setPulseOpen(true)}
              label="View product experience details"
            />
          }
        >
          <DashboardKpiGrid>
            <DashboardKpiCard
              label="User Satisfaction Rate"
              value="84%"
              description="Positive feedback"
            />
            <DashboardKpiCard
              label="Session & Query Volume"
              value="316K"
              description="Last 30 days"
            />
            <DashboardKpiCard
              label="End-to-End Latency"
              value="P95 1.20 s"
              description="Median customer wait time"
            />
            <DashboardKpiCard
              label="Adoption & Engagement"
              value="67%"
              description="Weekly active coverage"
            />
          </DashboardKpiGrid>
        </DashboardSection>

        <DashboardSection
          title="Adoption & engagement"
          actions={
            <DashboardSectionAction
              onClick={() => setEngagementOpen(true)}
              label="View adoption details"
            />
          }
        >
          <DashboardKpiGrid>
            <DashboardKpiCard
              label="Weekly Active Users"
              value="48.2K"
              description="+8.4% vs prior period"
            />
            <DashboardKpiCard
              label="Query Depth"
              value="3.6 / session"
              description="Productive usage intensity"
            />
            <DashboardKpiCard
              label="Channel Mix"
              value="62% web"
              description="Balanced activation"
            />
          </DashboardKpiGrid>
        </DashboardSection>

        <DashboardSection
          title="Channel mix"
          actions={
            <DashboardSectionAction
              onClick={() => setChannelOpen(true)}
              label="View channel mix details"
            />
          }
        >
          <DashboardKpiGrid>
            <DashboardKpiCard
              label="Web"
              value="62%"
              description="Most used channel"
            />
            <DashboardKpiCard
              label="API"
              value="24%"
              description="Developer workflows"
            />
            <DashboardKpiCard
              label="Mobile"
              value="14%"
              description="Emerging usage"
            />
          </DashboardKpiGrid>
        </DashboardSection>

        <DashboardSection
          title="Trust & measurement readiness"
          actions={
            <DashboardSectionAction
              onClick={() => setTrustOpen(true)}
              label="View trust details"
            />
          }
        >
          <DashboardKpiGrid>
            <DashboardKpiCard
              label="Safety Evaluators"
              value="92% pass"
              description="Guardrail readiness"
            />
            <DashboardKpiCard
              label="PII Leakage"
              value="99.8% clean"
              description="Low exposure risk"
            />
            <DashboardKpiCard
              label="Decision Readiness"
              value="Pending"
              description="Requires evidence validation"
            />
          </DashboardKpiGrid>
        </DashboardSection>

        <DashboardDrawer
          open={pulseOpen}
          title="Product experience pulse"
          onClose={() => setPulseOpen(false)}
        >
          <p>
            Customer experience is stable, with satisfaction and latency trends
            remaining within acceptable business thresholds for the rolling 30-day window.
          </p>
          <p>
            The strongest signals are user adoption, session depth, and response-quality
            consistency across top channels.
          </p>
        </DashboardDrawer>

        <DashboardDrawer
          open={engagementOpen}
          title="Adoption & engagement"
          onClose={() => setEngagementOpen(false)}
        >
          <p>
            Weekly active usage is up compared with the prior period, driven by more
            repeat sessions and higher query depth in the most active workflows.
          </p>
          <p>
            This indicates healthy engagement momentum but should be reviewed alongside
            channel quality and trust signals before scaling feature investment.
          </p>
        </DashboardDrawer>

        <DashboardDrawer
          open={channelOpen}
          title="Channel mix"
          onClose={() => setChannelOpen(false)}
        >
          <p>
            Web remains the dominant channel for product engagement, while API usage
            continues to grow among internal and partner-driven workflows.
          </p>
          <p>
            Mobile remains a smaller but improving channel and should be monitored for
            adoption and quality stability as new flows roll out.
          </p>
        </DashboardDrawer>

        <DashboardDrawer
          open={trustOpen}
          title="Trust & measurement readiness"
          onClose={() => setTrustOpen(false)}
        >
          <p>
            Safety and leakage indicators remain healthy, but readiness for product-level
            decision making remains partially pending until ownership and evidence review are complete.
          </p>
          <p>
            This is a product decision gate, not a security incident signal; the goal is
            to confirm whether these measurements are suitable for outcome-level decisions.
          </p>
        </DashboardDrawer> */}
      </DashboardGrid>
    </DashboardPage>
  );
}
