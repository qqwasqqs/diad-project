"use client";

import { useState } from "react";

import DashboardPage from "@/components/shared/dashboard/DashboardPage";
import DashboardGrid from "@/components/shared/dashboard/DashboardGrid";
import DashboardPanel from "@/components/shared/dashboard/DashboardPanel";
import DashboardSectionAction from "@/components/shared/dashboard/DashboardSectionAction";
import { MetricCard } from "@/components/shared/dashboard/MetricCard";
import ProductOwnerAdoptionAndEngagementDrawer, {
  type ProductOwnerAdoptionAndEngagementData,
} from "@/components/shared/dashboard/drawers/ProductOwnerAdoptionAndEngagementDrawer";
import ProductOwnerChannelMixDrawer from "@/components/shared/dashboard/drawers/ProductOwnerChannelMixDrawer";
import ProductOwnerProductExperiencePulseDrawer, {
  type ProductExperiencePulseData,
} from "@/components/shared/dashboard/drawers/ProductOwnerProductExperiencePulseDrawer";
import { PositiveNegativeBar } from "@/components/shared/charts/PositiveNegativeBar";
import HorizontalBarList from "@/components/shared/charts/HorizontalBarList";
import DashboardLineChart, {
  type DashboardLineAxisConfig,
  type DashboardLineSeries,
} from "@/components/shared/dashboard/DashboardLineChart";
import DataPendingCard from "@/components/shared/dashboard/DataPendingCard";
import StatusCallout from "@/components/shared/dashboard/StatusCallout";
import {
  ArrowSync24Regular,
  Clock24Regular,
  DataTrending24Regular,
  Hourglass24Regular,
  LockClosed24Regular,
  Person24Regular,
  Scales32Regular,
  ShieldCheckmark24Regular,
  ThumbLike24Regular,
} from "@fluentui/react-icons";
import adoptionAndEngagementData from "@/public/mocks/new-pages/product-owner-adoption-and-engagement.json";
import productExperiencePulseData from "@/public/mocks/new-pages/product-owner-product-experience-pulse.json";

const channelMixValues = [
  { label: "Web", value: 52 },
  { label: "Teams", value: 28 },
  { label: "Mobile", value: 14 },
  { label: "API", value: 6 },
];

const channelMixComparison = [
  { label: "Web", queriesPerSession: 4.8, avgSession: "8.6 min" },
  { label: "Teams", queriesPerSession: 4.2, avgSession: "7.9 min" },
  { label: "Mobile", queriesPerSession: 3.7, avgSession: "6.4 min" },
  { label: "API", queriesPerSession: 5.1, avgSession: "9.1 min" },
];

const productExperiencePulseSections = [
  { id: "session-query-volume" },
  { id: "user-satisfaction-rate" },
  { id: "end-to-end-latency" },
  { id: "workflow-completion" },
];

const adoptionAndEngagementSeries: DashboardLineSeries[] = [
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
];

const adoptionAndEngagementAxes: DashboardLineAxisConfig[] = [
  {
    id: "left",
    tickFormatter: (value: number) => `${Math.round(value / 1000)}K`,
  },
  {
    id: "right",
    tickFormatter: (value: number) => `${Math.round(value / 1000)}K`,
  },
];

const adoptionAndEngagementStats = [
  {
    id: "queries-per-session",
    icon: <Person24Regular aria-hidden="true" />,
    value: "4.6",
    text: "queries/session",
    iconColor: "#4f46e5",
  },
  {
    id: "avg-session",
    icon: <Clock24Regular aria-hidden="true" />,
    value: "8.2 min",
    text: "avg session",
    iconColor: "#2563eb",
  },
];

const experienceQualitySeries: DashboardLineSeries[] = [
  {
    id: "groundedness",
    label: "Groundedness",
    color: "#4f46e5",
    points: [
      { x: "Apr 20", y: 4.1 },
      { x: "Apr 22", y: 4.3 },
      { x: "Apr 24", y: 4.2 },
      { x: "Apr 26", y: 4.4 },
      { x: "Apr 28", y: 4.3 },
      { x: "Apr 30", y: 4.2 },
      { x: "May 2", y: 4.5 },
      { x: "May 4", y: 4.4 },
      { x: "May 6", y: 4.3 },
      { x: "May 8", y: 4.5 },
      { x: "May 10", y: 4.6 },
      { x: "May 12", y: 4.5 },
    ],
  },
  {
    id: "relevance-quality",
    label: "Relevance Quality",
    color: "#7c3aed",
    points: [
      { x: "Apr 20", y: 3.8 },
      { x: "Apr 22", y: 3.9 },
      { x: "Apr 24", y: 4.0 },
      { x: "Apr 26", y: 4.1 },
      { x: "Apr 28", y: 4.0 },
      { x: "Apr 30", y: 4.2 },
      { x: "May 2", y: 4.1 },
      { x: "May 4", y: 4.2 },
      { x: "May 6", y: 4.1 },
      { x: "May 8", y: 4.3 },
      { x: "May 10", y: 4.2 },
      { x: "May 12", y: 4.4 },
    ],
  },
  {
    id: "intent-resolution",
    label: "Intent Resolution",
    color: "#0f766e",
    points: [
      { x: "Apr 20", y: 3.2 },
      { x: "Apr 22", y: 3.4 },
      { x: "Apr 24", y: 3.3 },
      { x: "Apr 26", y: 3.5 },
      { x: "Apr 28", y: 3.4 },
      { x: "Apr 30", y: 3.6 },
      { x: "May 2", y: 3.7 },
      { x: "May 4", y: 3.6 },
      { x: "May 6", y: 3.8 },
      { x: "May 8", y: 3.7 },
      { x: "May 10", y: 3.9 },
      { x: "May 12", y: 3.8 },
    ],
  },
];

const experienceQualityAxes: DashboardLineAxisConfig[] = [
  {
    id: "left",
    domain: [0, 5],
    tickFormatter: (value: number) => `${value}`,
  },
];

const experienceQualityStats = [
  {
    id: "retrieval-quality",
    value: "4.0 / 5",
    text: "Retrieval Quality",
  },
  {
    id: "task-adherence",
    value: "4.2 / 5",
    text: "Task Adherence",
  },
];

const trustReadinessSections = [
  { id: "safety-evaluators" },
  { id: "mlflow-safety-score" },
  { id: "pii-leakage" },
  { id: "upia" },
];

const trustReadinessCallouts = [
  {
    id: "safety-evaluators",
    icon: <ShieldCheckmark24Regular aria-hidden="true" />,
    title: "Safety Evaluators",
    primaryContent: "CALCULATION PENDING",
    variant: "warning" as const,
  },
  {
    id: "mlflow-safety-score",
    icon: <Scales32Regular aria-hidden="true" />,
    title: "MLflow Safety Score",
    primaryContent: "0.91 / 1",
    variant: "success" as const,
  },
  {
    id: "pii-leakage",
    icon: <LockClosed24Regular aria-hidden="true" />,
    title: "PII Leakage (Agent Only)",
    primaryContent: "DATA PENDING",
    variant: "danger" as const,
  },
  {
    id: "upia",
    icon: <ShieldCheckmark24Regular aria-hidden="true" />,
    title: "UPIA",
    primaryContent: "TEST RESULTS PENDING",
    variant: "warning" as const,
  },
];

export default function ProductOwnerDashboard() {
  const [adoptionAndEngagementOpen, setAdoptionAndEngagementOpen] = useState(false);
  const [channelMixOpen, setChannelMixOpen] = useState(false);
  const [productExperiencePulseOpen, setProductExperiencePulseOpen] = useState(false);

  return (
    <>
      <DashboardPage
        title="AI Observability — Product Owner Dashboard"
        description="Understand adoption, user experience, and business value"
      >
        <DashboardGrid>
        <DashboardPanel
          template="segmented"
          title="Product experience pulse"
          sections={productExperiencePulseSections}
          className="xl:col-span-2"
          actions={
            <DashboardSectionAction
              onClick={() => setProductExperiencePulseOpen(true)}
              label="View product experience pulse details"
            />
          }
        >
          <MetricCard
            icon={<DataTrending24Regular className="text-blue-600" />}
            title="Session & Query Volume"
            className="h-[170px] metricCard-violet"
            primaryContent={
              <div className="text-[38px] leading-none font-semibold text-neutral-950">
                316K <span className="text-4xl font-normal">queries</span>
              </div>
            }
            supportingContent={
              <span className="text-xs text-neutral-500">
                68K sessions • 4.6 queries/session
              </span>
            }
          />
          <MetricCard
            icon={<ThumbLike24Regular className="text-green-600" />}
            title="User Satisfaction Rate"
            className="h-[170px] metricCard-success"
            primaryContent={
              <div className="text-[38px] leading-none font-semibold text-neutral-950">
                84% <span className="text-4xl font-normal">positive</span>
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
            icon={<ArrowSync24Regular className="text-green-600" />}
            title="End-to-End Latency"
            className="h-[170px] metricCard-success"
            primaryContent={
              <div className="text-[38px] leading-none font-semibold text-neutral-950">
                P95 <span className="text-4xl font-normal">1.20 s</span>
              </div>
            }
          />
          <MetricCard
            icon={<Hourglass24Regular className="text-amber-700" />}
            title="Workflow Completion"
            className="h-[170px] metricCard-warning"
            primaryContent={
              <div className="text-[30px] leading-none font-semibold text-slate-500">
                DATA PENDING
              </div>
            }
            supportingContent={
              <span className="text-xs text-neutral-500">
                Completion event and formula not supplied
              </span>
            }
          />
        </DashboardPanel>



        <DashboardPanel
          template="single"
          title="Adoption and engagement"
          actions={
            <DashboardSectionAction
              onClick={() => setAdoptionAndEngagementOpen(true)}
              label="View engagement patterns details"
            />
          }
        >
          <DashboardLineChart
            description=""
            height={320}
            supportingStatsVariant="productOwner"
            series={adoptionAndEngagementSeries}
            axes={adoptionAndEngagementAxes}
            supportingStats={adoptionAndEngagementStats}
          />
        </DashboardPanel>

        <DashboardPanel
          template="single"
          title="Channel mix"
          actions={
            <DashboardSectionAction
              onClick={() => setChannelMixOpen(true)}
              label="View channel mix details"
            />
          }
        >
          <HorizontalBarList values={channelMixValues} />
          <div className="mt-2 text-[11px] font-medium text-neutral-500">
            Illustrative channel breakdown
          </div>
        </DashboardPanel>

        <DashboardPanel template="single" title="Experience and response quality">
          <DashboardLineChart
            height={300}
            supportingStatsVariant="productOwner"
            supportingStatsTemplate="right"
            series={experienceQualitySeries}
            axes={experienceQualityAxes}
            supportingStats={experienceQualityStats}
          />
        </DashboardPanel>

        <DashboardPanel title="Feature usage evidence" template="single">
          <DataPendingCard description="No feature identifier or usage formula supplied" />
        </DashboardPanel>

        <DashboardPanel
          template="segmented"
          title="Trust and measurement readiness"
          sections={trustReadinessSections}
          className="xl:col-span-2"
        >
          {trustReadinessCallouts.map(({ id, icon, title, primaryContent, variant }) => (
            <StatusCallout
              key={id}
              icon={icon}
              title={title}
              primaryContent={primaryContent}
              variant={variant}
            />
          ))}
        </DashboardPanel>

      </DashboardGrid>
    </DashboardPage>

    <ProductOwnerChannelMixDrawer
      open={channelMixOpen}
      onClose={() => setChannelMixOpen(false)}
      values={channelMixValues}
      comparison={channelMixComparison}
    />
    <ProductOwnerAdoptionAndEngagementDrawer
      open={adoptionAndEngagementOpen}
      onClose={() => setAdoptionAndEngagementOpen(false)}
      data={adoptionAndEngagementData as ProductOwnerAdoptionAndEngagementData}
    />
    <ProductOwnerProductExperiencePulseDrawer
      open={productExperiencePulseOpen}
      onClose={() => setProductExperiencePulseOpen(false)}
      data={productExperiencePulseData as ProductExperiencePulseData}
    />
    </>
  );
}
