"use client";

import { useState, type ReactNode } from "react";
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
import ProductOwnerFeedbackSummary from "@/components/shared/dashboard/ProductOwnerFeedbackSummary/ProductOwnerFeedbackSummary";
import StatusCallout, {
  type StatusCalloutVariant,
} from "@/components/shared/dashboard/StatusCallout";
import ProductOwnerAdoptionAndEngagementDrawer, {
  type ProductOwnerAdoptionAndEngagementData,
} from "@/components/shared/dashboard/drawers/product-owner/ProductOwnerAdoptionAndEngagementDrawer";
import ProductOwnerChannelMixDrawer, {
  type ProductOwnerChannelMixData,
} from "@/components/shared/dashboard/drawers/product-owner/ProductOwnerChannelMixDrawer";
import ProductOwnerExperienceQualityDrawer, {
  type ProductOwnerExperienceQualityData,
} from "@/components/shared/dashboard/drawers/product-owner/ProductOwnerExperienceQualityDrawer";
import ProductOwnerProductExperiencePulseDrawer, {
  type ProductExperiencePulseData,
} from "@/components/shared/dashboard/drawers/product-owner/ProductOwnerProductExperiencePulseDrawer";
import ProductOwnerTrustEvidenceDrawer, {
  type ProductOwnerTrustEvidenceData,
} from "@/components/shared/dashboard/drawers/product-owner/ProductOwnerTrustEvidenceDrawer";
import productOwnerSections from "@/content/dashboards/product-owner-sections.json";
import { useProductOwnerMainView } from "@/hooks/useProductOwnerDashboardEndpoints";
import adoptionAndEngagementData from "@/public/mocks/new-pages/product-owner-adoption-and-engagement.json";
import channelMixData from "@/public/mocks/new-pages/product-owner-channel-mix.json";
import experienceQualityData from "@/public/mocks/new-pages/product-owner-experience-quality.json";
import productExperiencePulseData from "@/public/mocks/new-pages/product-owner-product-experience-pulse.json";
import trustEvidenceData from "@/public/mocks/new-pages/product-owner-trust-evidence.json";
import { useDashboardFiltersStore } from "@/store/dashboardFiltersStore";
import type {
  ProductOwnerDashboardAvailabilityStatus,
  ProductOwnerDashboardTimeseriesPayload,
} from "@/types/productOwnerDashboard";

/*
  Product Owner main view.

  Dashboard metrics and both charts come from the dashboard endpoints through
  useProductOwnerMainView. Channel is not part of the Product Owner request
  contract; the Channel Mix card remains local until that metric is replaced.
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

const compactNumber = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const adoptionAndEngagementAxes: DashboardLineAxisConfig[] = [
  {
    id: "left",
    tickFormatter: (value: number) => compactNumber.format(value),
  },
  {
    id: "right",
    tickFormatter: (value: number) => `${Math.round(value / 1000)}K`,
  },
];

const experienceQualityAxes: DashboardLineAxisConfig[] = [
  {
    id: "left",
    domain: [0, 5],
    tickFormatter: (value: number) => `${value}`,
  },
];

const seriesPresentation: Record<
  string,
  Pick<DashboardLineSeries, "label" | "color" | "yAxis">
> = {
  sessions: { label: "Sessions", color: "#3b82f6", yAxis: "left" },
  queries: { label: "Queries", color: "#8b5cf6", yAxis: "right" },
  groundedness: { label: "Groundedness", color: "#4f46e5" },
  "relevance-quality": { label: "Relevance Quality", color: "#7c3aed" },
  "intent-resolution": { label: "Intent Resolution", color: "#0f766e" },
};

const itemLabels: Record<string, string> = {
  sessions: "Sessions",
  queries: "Queries",
  "queries-per-session": "Queries per session",
  "avg-session-duration-minutes": "Average session duration",
  groundedness: "Groundedness",
  "relevance-quality": "Relevance Quality",
  "intent-resolution": "Intent Resolution",
  "retrieval-quality": "Retrieval Quality",
  "task-adherence": "Task Adherence",
};

const statusLabels: Record<ProductOwnerDashboardAvailabilityStatus, string> = {
  OK: "OK",
  DATA_PENDING: "DATA PENDING",
  CALCULATION_PENDING: "CALCULATION PENDING",
  FILTER_BREAKDOWN_UNAVAILABLE: "FILTER BREAKDOWN UNAVAILABLE",
  NO_DATA: "NO DATA",
  ERROR: "UNAVAILABLE",
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

function requestErrorMessage(error: Error | null): string {
  return error?.message ?? "The endpoint request failed";
}

function MetricStateValue({ children }: { children: ReactNode }) {
  return (
    <div className="text-[26px] leading-tight font-semibold text-slate-500">
      {children}
    </div>
  );
}

function MetricSupportingState({ children }: { children: ReactNode }) {
  return <span className="text-xs text-neutral-500">{children}</span>;
}

function formatMetricRow(
  amount: number | undefined,
  decimals = 0,
  unit = "",
): string {
  return amount === undefined ? "" : `${amount.toFixed(decimals)}${unit}`;
}

function toLineSeries(
  chart: ProductOwnerDashboardTimeseriesPayload | undefined,
): DashboardLineSeries[] {
  if (!chart) {
    return [];
  }

  return chart.series.flatMap((item) => {
    const presentation = seriesPresentation[item.metricId];

    return item.status === "OK" && presentation
      ? [{ id: item.metricId, ...presentation, points: item.points }]
      : [];
  });
}

function ChartRequestState({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[300px] items-center justify-center text-sm text-neutral-600">
      {children}
    </div>
  );
}

function ChartAvailabilityNotes({
  chart,
}: {
  chart: ProductOwnerDashboardTimeseriesPayload;
}) {
  const unavailable = [...chart.series, ...chart.supportingStats].filter(
    (item) => item.status !== "OK",
  );

  if (unavailable.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 space-y-1 text-xs text-neutral-600">
      {unavailable.map((item) => (
        <div key={item.metricId}>
          <span className="font-semibold">
            {itemLabels[item.metricId] ?? item.metricId}:
          </span>{" "}
          {statusLabels[item.status]} — {item.reason}
        </div>
      ))}
    </div>
  );
}

export default function ProductOwnerDashboard() {
  const period = useDashboardFiltersStore((state) => state.period);
  const businessUnit = useDashboardFiltersStore((state) => state.businessUnit);
  const project = useDashboardFiltersStore((state) => state.project);

  const { metrics, adoption, quality } = useProductOwnerMainView({
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

  const trustReadinessRows =
    metrics.data?.trustAndMeasurementReadiness ?? [];
  const trustReadinessSections = trustReadinessRows.map((row) => ({
    id: row.id,
  }));

  const sessionMetric =
    metrics.data?.productExperiencePulse.sessionQueryVolume;
  const latencyMetric = metrics.data?.productExperiencePulse.endToEndLatency;
  const workflowMetric =
    metrics.data?.productExperiencePulse.workflowCompletion;

  const adoptionSeries = toLineSeries(adoption.data);
  const adoptionStats =
    adoption.data?.supportingStats.flatMap((stat) => {
      if (stat.status !== "OK") {
        return [];
      }

      if (stat.metricId === "queries-per-session") {
        return [
          {
            id: stat.metricId,
            icon: <Person24Regular key="queries-per-session" aria-hidden="true" />,
            value: stat.value.toFixed(1),
            text: "queries/session",
            iconColor: "#4f46e5",
          },
        ];
      }

      if (stat.metricId === "avg-session-duration-minutes") {
        return [
          {
            id: stat.metricId,
            icon: <Clock24Regular key="avg-session" aria-hidden="true" />,
            value: `${stat.value.toFixed(1)} min`,
            text: "avg session",
            iconColor: "#2563eb",
          },
        ];
      }

      return [];
    }) ?? [];

  const qualitySeries = toLineSeries(quality.data);
  const qualityStats =
    quality.data?.supportingStats.flatMap((stat) =>
      stat.status === "OK" &&
      (stat.metricId === "retrieval-quality" ||
        stat.metricId === "task-adherence")
        ? [
            {
              id: stat.metricId,
              value: `${stat.value.toFixed(1)} / 5`,
              text: itemLabels[stat.metricId],
            },
          ]
        : [],
    ) ?? [];

  return (
    <>
      <DashboardPage
        title="AI Observability — Product Owner Dashboard"
        description="Understand adoption, user experience, and business value"
      >
        {metrics.data?.feedbackSummary && (
          <ProductOwnerFeedbackSummary data={metrics.data.feedbackSummary} />
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
                metrics.isPending ? (
                  <MetricStateValue>LOADING…</MetricStateValue>
                ) : metrics.isError ? (
                  <MetricStateValue>REQUEST FAILED</MetricStateValue>
                ) : sessionMetric ? (
                  <div className="text-[38px] leading-none font-semibold text-neutral-950">
                    {compactNumber.format(sessionMetric.queries)}{" "}
                    <span className="text-4xl font-normal">queries</span>
                  </div>
                ) : (
                  <MetricStateValue>DATA PENDING</MetricStateValue>
                )
              }
              supportingContent={
                <MetricSupportingState>
                  {metrics.isPending
                    ? "Loading metric data"
                    : metrics.isError
                      ? requestErrorMessage(metrics.error)
                      : sessionMetric
                        ? `${compactNumber.format(sessionMetric.sessions)} sessions • ${sessionMetric.queriesPerSession.toFixed(1)} queries/session`
                        : "Metric was not returned"}
                </MetricSupportingState>
              }
            />
            <MetricCard
              icon={<Warning24Regular className="text-slate-600" />}
              title="API Error Rate"
              className="h-[170px]"
              iconWrapperClassName="h-10 w-10 bg-slate-100"
              primaryContent={
                metrics.isPending ? (
                  <MetricStateValue>LOADING…</MetricStateValue>
                ) : metrics.isError ? (
                  <MetricStateValue>REQUEST FAILED</MetricStateValue>
                ) : (
                  <PendingStateValue
                    state="calculation"
                    className="!text-[30px] !leading-none"
                  />
                )
              }
              supportingContent={
                <MetricSupportingState>
                  {metrics.isPending
                    ? "Loading metric data"
                    : metrics.isError
                      ? requestErrorMessage(metrics.error)
                      : "Error classification and eligible-request rules are not approved"}
                </MetricSupportingState>
              }
            />
            <MetricCard
              icon={<ArrowSync24Regular className="text-green-600" />}
              title="End-to-End Latency"
              className="h-[170px] metricCard-success"
              primaryContent={
                metrics.isPending ? (
                  <MetricStateValue>LOADING…</MetricStateValue>
                ) : metrics.isError ? (
                  <MetricStateValue>REQUEST FAILED</MetricStateValue>
                ) : latencyMetric ? (
                  <div className="text-[38px] leading-none font-semibold text-neutral-950">
                    {latencyMetric.percentile}{" "}
                    <span className="text-4xl font-normal">
                      {latencyMetric.seconds.toFixed(2)} s
                    </span>
                  </div>
                ) : (
                  <MetricStateValue>DATA PENDING</MetricStateValue>
                )
              }
              supportingContent={
                !latencyMetric || metrics.isPending || metrics.isError ? (
                  <MetricSupportingState>
                    {metrics.isPending
                      ? "Loading metric data"
                      : metrics.isError
                        ? requestErrorMessage(metrics.error)
                        : "Metric was not returned"}
                  </MetricSupportingState>
                ) : undefined
              }
            />
            <MetricCard
              icon={<Hourglass24Regular className="text-amber-700" />}
              title="Workflow Completion"
              className="h-[170px] metricCard-warning"
              primaryContent={
                metrics.isPending ? (
                  <MetricStateValue>LOADING…</MetricStateValue>
                ) : metrics.isError ? (
                  <MetricStateValue>REQUEST FAILED</MetricStateValue>
                ) : workflowMetric?.pendingState ? (
                  <PendingStateValue
                    state={workflowMetric.pendingState}
                    className="!text-[30px] !leading-none"
                  />
                ) : (
                  <MetricStateValue>DATA PENDING</MetricStateValue>
                )
              }
              supportingContent={
                <MetricSupportingState>
                  {metrics.isPending
                    ? "Loading metric data"
                    : metrics.isError
                      ? requestErrorMessage(metrics.error)
                      : workflowMetric?.reason ?? "Metric was not returned"}
                </MetricSupportingState>
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
            {adoption.isPending ? (
              <ChartRequestState>Loading adoption and engagement…</ChartRequestState>
            ) : adoption.isError ? (
              <ChartRequestState>
                <span role="alert">{requestErrorMessage(adoption.error)}</span>
              </ChartRequestState>
            ) : adoption.data ? (
              <>
                <DashboardLineChart
                  description=""
                  height={320}
                  supportingStatsVariant="productOwner"
                  series={adoptionSeries}
                  axes={adoptionAndEngagementAxes}
                  supportingStats={adoptionStats}
                />
                <ChartAvailabilityNotes chart={adoption.data} />
              </>
            ) : (
              <ChartRequestState>No adoption data returned</ChartRequestState>
            )}
          </DashboardPanel>

          <DashboardPanel
            className="self-start !h-auto"
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
            {quality.isPending ? (
              <ChartRequestState>Loading experience and response quality…</ChartRequestState>
            ) : quality.isError ? (
              <ChartRequestState>
                <span role="alert">{requestErrorMessage(quality.error)}</span>
              </ChartRequestState>
            ) : quality.data ? (
              <>
                <DashboardLineChart
                  height={300}
                  supportingStatsVariant="productOwner"
                  supportingStatsTemplate="right"
                  series={qualitySeries}
                  axes={experienceQualityAxes}
                  supportingStats={qualityStats}
                />
                <ChartAvailabilityNotes chart={quality.data} />
              </>
            ) : (
              <ChartRequestState>No quality data returned</ChartRequestState>
            )}
          </DashboardPanel>

          <DashboardPanel
            template="single"
            title="Feature usage evidence"
            fillHeight
          >
            {metrics.data?.featureUsageEvidence && (
              <DataPendingCard
                statusLabel={metrics.data.featureUsageEvidence.statusLabel}
                description={metrics.data.featureUsageEvidence.description}
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
            {trustReadinessRows.map((row) => {
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
                      formatMetricRow(row.amount, row.decimals, row.unit)
                    )
                  }
                  variant={presentation?.variant ?? "neutral"}
                />
              );
            })}
          </DashboardPanel>
        </DashboardGrid>
      </DashboardPage>

      <ProductOwnerChannelMixDrawer
        open={channelMixOpen}
        onClose={() => setChannelMixOpen(false)}
        data={channelMixData as ProductOwnerChannelMixData}
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
      <ProductOwnerExperienceQualityDrawer
        open={experienceQualityOpen}
        onClose={() => setExperienceQualityOpen(false)}
        data={experienceQualityData as ProductOwnerExperienceQualityData}
      />
      <ProductOwnerTrustEvidenceDrawer
        open={trustEvidenceOpen}
        onClose={() => setTrustEvidenceOpen(false)}
        data={trustEvidenceData as ProductOwnerTrustEvidenceData}
      />
    </>
  );
}
