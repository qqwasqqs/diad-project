"use client";
import DashboardPage from "@/components/shared/dashboard/DashboardPage";
import  DashboardGrid  from "@/components/shared/dashboard/DashboardGrid";
import  DashboardSection  from "@/components/shared/dashboard/DashboardSection";
import StatusCallout from "@/components/shared/dashboard/StatusCallout";
import { Scales32Regular,ShieldCheckmark24Regular, LockClosed24Regular, ArrowSync24Regular, DataTrending24Regular, ThumbLike24Regular } from "@fluentui/react-icons";
import { Badge, Text } from "@fluentui/react-components";
import DashboardPanel from "@/components/shared/dashboard/DashboardPanel";
import { MetricCard } from "@/components/shared/dashboard/MetricCard";
import { PositiveNegativeBar } from "@/components/shared/charts/PositiveNegativeBar";

export default function ExecutiveDashboard() {
  return (
    <DashboardPage
      title="AI Observability — Executive Dashboard"
      description="Diagnose request paths, failures, evaluator quality, and capacity"
    >
      <DashboardGrid>

      <DashboardPanel template="single" title="Shared Panel - single region">
          <div className="p-2">
            <StatusCallout
              icon={<ShieldCheckmark24Regular />}
              title="Safety Evaluators"
              primaryContent="CALCULATION PENDING"
              variant="warning"
            />

            <StatusCallout
              icon={<Scales32Regular />}
              title="MLflow safety Score"
              primaryContent={
                <Text size={600} weight="semibold">
                98.4%
                </Text>
              }
              variant="success"
            />
            <StatusCallout
              icon={<LockClosed24Regular />}
              title="PII Leakage (Agent Only)"
              primaryContent={
                <Badge color="warning">
                  Calculation Pending
                </Badge>
              }
              variant="danger"
            />
          </div>
        </DashboardPanel>

        <DashboardPanel template="single" title="Shared Panel - single region">
          <div className="p-2">
          <MetricCard
              icon={<ArrowSync24Regular className="text-green-600" />}
              title="End-to-End Latency"
              className="metricCard-success"
              primaryContent={
                <div className="text-xl font-semibold text-neutral-950">
                  P95 <span>1.20 s</span>
                </div>
              }
            />
            
            <MetricCard
              icon={<DataTrending24Regular className="text-violet-600" />}
              title={
                <span>Session & Query Volume <br/>(sample text) </span>
              }
              className="metricCard-violet"
              primaryContent={
                <div className="text-xl font-semibold text-neutral-950">
                  316K <span className="text-2xl font-normal">queries</span>
                </div>
              }
              supportingContent={
                <span className="text-2xs text-neutral-500">
                  4.6 queries/session • 8.2 min avg session
                </span>
              }
            />

            <MetricCard
              icon={<ThumbLike24Regular className="text-green-600" />}
              title="User Feedback"
              className="metricCard-success"
              primaryContent={
                <div className="text-xl font-semibold text-neutral-950">
                  84% <span className="text-2xl font-normal">positive</span>
                </div>
              }
              supportingContent={
                <PositiveNegativeBar
                  positive={84}
                  negative={16}
                />
              }
            />

<MetricCard
              icon={<ArrowSync24Regular className="text-orange-600" />}
              title="End-to-End Latency"
              className="metricCard-warning"
              primaryContent={
                <div className="text-xl font-semibold text-neutral-950">
                  P95 <span>1.20 s</span>
                </div>
              }
            />
            <MetricCard
              icon={<ArrowSync24Regular className="text-red-600" />}
              title="End-to-End Latency"
              className="metricCard-danger"
              primaryContent={
                <div className="text-xl font-semibold text-neutral-950">
                  P95 <span>1.20 s</span>
                </div>
              }
            />
          </div>
        </DashboardPanel>
        

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