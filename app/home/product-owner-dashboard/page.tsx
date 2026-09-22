"use client";

import { useState } from "react";
import {
  ArrowSync24Regular,
  Clock24Regular,
  DataTrending24Regular,
  Hourglass24Regular,
  LockClosed24Regular,
  Person24Regular,
  Scales32Regular,
  ShieldCheckmark24Regular,
  Warning24Regular,
} from "@fluentui/react-icons";

import HorizontalBarList from "@/components/shared/charts/HorizontalBarList";
import DashboardGrid from "@/components/shared/dashboard/DashboardGrid";
import DashboardLineChart, {
  type DashboardLineAxisConfig,
  type DashboardLineAxisId,
  type DashboardLineSeries,
} from "@/components/shared/dashboard/DashboardLineChart";
import DashboardPage from "@/components/shared/dashboard/DashboardPage";
import DashboardPanel from "@/components/shared/dashboard/DashboardPanel";
import DashboardSectionAction from "@/components/shared/dashboard/DashboardSectionAction";
import DashboardSectionInfo, {
  type DashboardSectionInfoContent,
} from "@/components/shared/dashboard/DashboardSectionInfo";
import DataPendingCard from "@/components/shared/dashboard/DataPendingCard";
import { MetricCard } from "@/components/shared/dashboard/MetricCard";
import PendingStateValue from "@/components/shared/dashboard/PendingStateValue";
import ProductOwnerApiErrorRate from "@/components/shared/dashboard/ProductOwnerApiErrorRate";
import ProductOwnerFeedbackSummary from "@/components/shared/dashboard/ProductOwnerFeedbackSummary/ProductOwnerFeedbackSummary";
import StatusCallout, {
  type StatusCalloutVariant,
} from "@/components/shared/dashboard/StatusCallout";
import ProductOwnerAdoptionAndEngagementDrawer from "@/components/shared/dashboard/drawers/product-owner/ProductOwnerAdoptionAndEngagementDrawer";
import ProductOwnerChannelMixDrawer from "@/components/shared/dashboard/drawers/product-owner/ProductOwnerChannelMixDrawer";
import ProductOwnerExperienceQualityDrawer from "@/components/shared/dashboard/drawers/product-owner/ProductOwnerExperienceQualityDrawer";
import ProductOwnerProductExperiencePulseDrawer from "@/components/shared/dashboard/drawers/product-owner/ProductOwnerProductExperiencePulseDrawer";
import ProductOwnerTrustEvidenceDrawer from "@/components/shared/dashboard/drawers/product-owner/ProductOwnerTrustEvidenceDrawer";
import productOwnerSections from "@/content/dashboards/product-owner-sections.json";
import { useDashboardProductOwnerMainView } from "@/hooks/useProductOwnerDashboard";
import { useDashboardFiltersStore } from "@/store/dashboardFiltersStore";

/*
  Product Owner main view.

  Metric values come from the main-view endpoint through
  useDashboardProductOwnerMainView. The page only supplies presentation details
  such as icons, chart colors, axes, and panel layout. Channel is not part of
  the Product Owner request contract; the existing Channel Mix card remains
  local until that metric is replaced.
*/

const sectionInfo = productOwnerSections as Record<
  string,
  DashboardSectionInfoContent
>;

// Intentionally retained locally until the Channel Mix metric is replaced.
const channelMixValues = [
  { label: "Web", value: 52 },
  { label: "Teams", value: 28 },
  { label: "Mobile", value: 14 },
  { label: "API", value: 6 },
];

const productExperiencePulseSections = [
  { id: "session-query-volume" },
  { id: "api-error-rate" },
  { id: "end-to-end-latency" },
  { id: "workflow-completion" },
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

const adoptionSeriesPresentation: Record<
  string,
  { color: string; yAxis: DashboardLineAxisId }
> = {
  sessions: { color: "#3b82f6", yAxis: "left" },
  queries: { color: "#8b5cf6", yAxis: "right" },
};

const adoptionStatPresentation: Record<
  string,
  { icon: React.ReactNode; iconColor: string }
> = {
  "queries-per-session": {
    icon: <Person24Regular aria-hidden="true" />,
    iconColor: "#4f46e5",
  },
  "avg-session": {
    icon: <Clock24Regular aria-hidden="true" />,
    iconColor: "#2563eb",
  },
};

const experienceQualityAxes: DashboardLineAxisConfig[] = [
  {
    id: "left",
    domain: [0, 5],
    tickFormatter: (value: number) => `${value}`,
  },
];

const qualitySeriesColors: Record<string, string> = {
  groundedness: "#4f46e5",
  "relevance-quality": "#7c3aed",
  "intent-resolution": "#0f766e",
};

const trustReadinessPresentation: Record<
  string,
  { icon: React.ReactNode; variant: StatusCalloutVariant }
> = {
  "safety-evaluators": {
    icon: <ShieldCheckmark24Regular aria-hidden="true" />,
    variant: "warning",
  },
  "mlflow-safety-score": {
    icon: <Scales32Regular aria-hidden="true" />,
    variant: "success",
  },
  "pii-leakage": {
    icon: <LockClosed24Regular aria-hidden="true" />,
    variant: "danger",
  },
  upia: {
    icon: <ShieldCheckmark24Regular aria-hidden="true" />,
    variant: "warning",
  },
};

const compactNumberFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 0,
});

export default function ProductOwnerDashboard() {
  const period = useDashboardFiltersStore((state) => state.period);
  const businessUnit = useDashboardFiltersStore((state) => state.businessUnit);
  const project = useDashboardFiltersStore((state) => state.project);

  const { mainViewData: data } = useDashboardProductOwnerMainView({
    period,
    businessUnit,
    project,
  });

  const [adoptionAndEngagementOpen, setAdoptionAndEngagementOpen] =
    useState(false);
  const [channelMixOpen, setChannelMixOpen] = useState(false);
  const [productExperiencePulseOpen, setProductExperiencePulseOpen] =
    useState(false);
  const [experienceQualityOpen, setExperienceQualityOpen] = useState(false);
  const [trustEvidenceOpen, setTrustEvidenceOpen] = useState(false);

  const pulse = data?.productExperiencePulse;
  const drawers = data?.drawers;

  const adoptionAndEngagementSeries: DashboardLineSeries[] =
    data?.adoptionAndEngagement.series.map((series) => ({
      ...series,
      color:
        adoptionSeriesPresentation[series.id]?.color ??
        "var(--color-chart-series-1)",
      yAxis: adoptionSeriesPresentation[series.id]?.yAxis ?? "left",
    })) ?? [];

  const adoptionAndEngagementStats =
    data?.adoptionAndEngagement.supporting.map((stat) => ({
      id: stat.id,
      value: stat.value,
      text: stat.label,
      icon: adoptionStatPresentation[stat.id]?.icon,
      iconColor: adoptionStatPresentation[stat.id]?.iconColor,
    })) ?? [];

  const experienceQualitySeries: DashboardLineSeries[] =
    data?.experienceAndResponseQuality.series.map((series) => ({
      ...series,
      color:
        qualitySeriesColors[series.id] ?? "var(--color-chart-series-1)",
    })) ?? [];

  const experienceQualityStats =
    data?.experienceAndResponseQuality.supporting.map((stat) => ({
      id: stat.id,
      value: stat.value,
      text: stat.label,
    })) ?? [];

  const trustReadinessSections =
    data?.trustAndMeasurementReadiness.map((row) => ({ id: row.id })) ?? [];

  return (
    <>
      <DashboardPage
        title="AI Observability — Product Owner Dashboard"
        description="Understand adoption, user experience, and business value"
      >
        {data?.feedbackSummary && (
          <ProductOwnerFeedbackSummary data={data.feedbackSummary} />
        )}
        <DashboardGrid>
          <DashboardPanel
            template="segmented"
            footer={
              <DashboardSectionInfo
                sectionTitle="Product experience pulse"
                content={sectionInfo["product-experience-pulse"]}
              />
            }
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
                pulse && (
                  <div className="text-[38px] leading-none font-semibold text-neutral-950">
                    {compactNumberFormatter.format(
                      pulse.sessionQueryVolume.queries,
                    )}{" "}
                    <span className="text-4xl font-normal">queries</span>
                  </div>
                )
              }
              supportingContent={
                pulse && (
                  <span className="text-xs text-neutral-500">
                    {compactNumberFormatter.format(
                      pulse.sessionQueryVolume.sessions,
                    )}{" "}
                    sessions • {pulse.sessionQueryVolume.queriesPerSession}{" "}
                    queries/session
                  </span>
                )
              }
            />
            <MetricCard
              icon={<Warning24Regular className="text-slate-600" />}
              title="API Error Rate"
              className="h-[170px]"
              iconWrapperClassName="h-10 w-10 bg-slate-100"
              primaryContent={
                pulse && <ProductOwnerApiErrorRate {...pulse.apiErrorRate} />
              }
            />
            <MetricCard
              icon={<ArrowSync24Regular className="text-green-600" />}
              title="End-to-End Latency"
              className="h-[170px] metricCard-success"
              primaryContent={
                pulse && (
                  <div className="text-[38px] leading-none font-semibold text-neutral-950">
                    {pulse.endToEndLatency.percentile}{" "}
                    <span className="text-4xl font-normal">
                      {pulse.endToEndLatency.seconds.toFixed(2)} s
                    </span>
                  </div>
                )
              }
            />
            <MetricCard
              icon={<Hourglass24Regular className="text-amber-700" />}
              title="Workflow Completion"
              className="h-[170px] metricCard-warning"
              primaryContent={
                pulse?.workflowCompletion.pendingState ? (
                  <PendingStateValue
                    state={pulse.workflowCompletion.pendingState}
                    className="!text-[30px] !leading-none"
                  />
                ) : (
                  pulse?.workflowCompletion.value ?? null
                )
              }
              supportingContent={
                pulse && (
                  <span className="text-xs text-neutral-500">
                    {pulse.workflowCompletion.reason}
                  </span>
                )
              }
            />
          </DashboardPanel>

          <DashboardPanel
            footer={
              <DashboardSectionInfo
                sectionTitle="Adoption and engagement"
                content={sectionInfo["adoption-and-engagement"]}
              />
            }
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
            footer={
              <DashboardSectionInfo
                sectionTitle="Channel mix"
                content={sectionInfo["channel-mix"]}
              />
            }
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

          <DashboardPanel
            template="single"
            title="Experience and response quality"
            footer={
              <DashboardSectionInfo
                sectionTitle="Experience and response quality"
                content={sectionInfo["experience-and-response-quality"]}
              />
            }
            actions={
              <DashboardSectionAction
                onClick={() => setExperienceQualityOpen(true)}
                label="View experience quality evidence details"
              />
            }
          >
            <DashboardLineChart
              height={300}
              supportingStatsVariant="productOwner"
              supportingStatsTemplate="right"
              series={experienceQualitySeries}
              axes={experienceQualityAxes}
              supportingStats={experienceQualityStats}
            />
          </DashboardPanel>

          <DashboardPanel
            template="single"
            title="Feature usage evidence"
            fillHeight
          >
            {data?.featureUsageEvidence && (
              <DataPendingCard
                statusLabel={data.featureUsageEvidence.statusLabel}
                description={data.featureUsageEvidence.description}
              />
            )}
          </DashboardPanel>

          <DashboardPanel
            template="segmented"
            title="Trust and measurement readiness"
            sections={trustReadinessSections}
            footer={
              <DashboardSectionInfo
                sectionTitle="Trust and measurement readiness"
                content={sectionInfo["trust-and-measurement-readiness"]}
              />
            }
            className="xl:col-span-2"
            actions={
              <DashboardSectionAction
                onClick={() => setTrustEvidenceOpen(true)}
                label="View trust evidence decision guide"
              />
            }
          >
            {(data?.trustAndMeasurementReadiness ?? []).map((row) => {
              const presentation = trustReadinessPresentation[row.id];

              return (
                <StatusCallout
                  key={row.id}
                  icon={presentation?.icon}
                  title={row.label}
                  primaryContent={
                    row.pendingState ? (
                      <PendingStateValue
                        state={row.pendingState}
                        className="!text-lg !tracking-tight"
                      />
                    ) : (
                      row.value ?? ""
                    )
                  }
                  variant={presentation?.variant ?? "neutral"}
                />
              );
            })}
          </DashboardPanel>
        </DashboardGrid>
      </DashboardPage>

      {drawers?.channelMix && (
        <ProductOwnerChannelMixDrawer
          open={channelMixOpen}
          onClose={() => setChannelMixOpen(false)}
          data={drawers.channelMix}
        />
      )}
      {drawers?.adoptionAndEngagement && (
        <ProductOwnerAdoptionAndEngagementDrawer
          open={adoptionAndEngagementOpen}
          onClose={() => setAdoptionAndEngagementOpen(false)}
          data={drawers.adoptionAndEngagement}
        />
      )}
      {drawers?.productExperiencePulse && (
        <ProductOwnerProductExperiencePulseDrawer
          open={productExperiencePulseOpen}
          onClose={() => setProductExperiencePulseOpen(false)}
          data={drawers.productExperiencePulse}
        />
      )}
      {drawers?.experienceAndResponseQuality && (
        <ProductOwnerExperienceQualityDrawer
          open={experienceQualityOpen}
          onClose={() => setExperienceQualityOpen(false)}
          data={drawers.experienceAndResponseQuality}
        />
      )}
      {drawers?.trustAndMeasurementReadiness && (
        <ProductOwnerTrustEvidenceDrawer
          open={trustEvidenceOpen}
          onClose={() => setTrustEvidenceOpen(false)}
          data={drawers.trustAndMeasurementReadiness}
        />
      )}
    </>
  );
}
