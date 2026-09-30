"use client";

import { useState, type ReactNode } from "react";
import {
  ArrowSync24Regular,
  Clock24Regular,
  DataTrending24Regular,
  ErrorCircle24Regular,
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
// import { useDashboardProductOwnerMainView } from "@/hooks/useProductOwnerDashboard";
import { useDashboardFiltersStore } from "@/store/dashboardFiltersStore";
import { useProductOwnerMainView } from "@/hooks/useProductOwnerDashboardEndpoints";
import adoptionAndEngagementData from "@/public/mocks/new-pages/product-owner-adoption-and-engagement.json";
import channelMixData from "@/public/mocks/new-pages/product-owner-channel-mix.json";
import experienceQualityData from "@/public/mocks/new-pages/product-owner-experience-quality.json";
import productExperiencePulseData from "@/public/mocks/new-pages/product-owner-product-experience-pulse.json";
import trustEvidenceData from "@/public/mocks/new-pages/product-owner-trust-evidence.json";
import type { DashboardAvailabilityStatus } from "@/types/dashboardEndpointDtos";

/*
  Product Owner main view.

  Metric values come from the main-view endpoint through
  useDashboardProductOwnerMainView. The page only supplies presentation details
  such as icons, chart colors, axes, and panel layout. Channel is not part of
  the Product Owner request contract; the existing Channel Mix card remains
  local until that metric is replaced.
*/
import type {
  ProductOwnerChartModel,
  ProductOwnerMetricModel,
} from "@/types/productOwnerDashboardModels";

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
const wholeNumber = new Intl.NumberFormat("en", { maximumFractionDigits: 0 });

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

const statusLabels: Record<DashboardAvailabilityStatus, string> = {
  OK: "OK",
  DATA_PENDING: "DATA PENDING",
  CALCULATION_PENDING: "CALCULATION PENDING",
  FILTER_BREAKDOWN_UNAVAILABLE: "FILTER BREAKDOWN UNAVAILABLE",
  NO_DATA: "NO DATA",
  ERROR: "UNAVAILABLE",
};

const trustReadinessSections = [
  { id: "safety-evaluators" },
  { id: "mlflow-safety-score" },
  { id: "pii-leakage" },
  { id: "upia" },
];

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

function metricUnavailable(
  metric: ProductOwnerMetricModel | undefined,
): { label: string; reason: string } {
  if (!metric) {
    return { label: "DATA PENDING", reason: "Metric was not returned" };
  }

  if (metric.status === "OK") {
    return { label: "OK", reason: "" };
  }

  return { label: statusLabels[metric.status], reason: metric.reason };
}

function toLineSeries(chart: ProductOwnerChartModel | undefined): DashboardLineSeries[] {
  if (!chart) {
    return [];
  }

  return chart.series.flatMap((item) => {
    const presentation = seriesPresentation[item.id];

    return item.status === "OK" && presentation
      ? [{ id: item.id, ...presentation, points: item.points }]
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

function ChartAvailabilityNotes({ chart }: { chart: ProductOwnerChartModel }) {
  const unavailable = [...chart.series, ...chart.supportingStats].filter(
    (item) => item.status !== "OK",
  );

  if (unavailable.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 space-y-1 text-xs text-neutral-600">
      {unavailable.map((item) => (
        <div key={item.id}>
          <span className="font-semibold">{itemLabels[item.id] ?? item.id}:</span>{" "}
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

  // const { mainViewData: data } = useDashboardProductOwnerMainView({
  //   period,
  //   businessUnit,
  //   project,
  // });
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


  const sessionMetric = metrics.data?.metrics.find(
    (metric) => metric.id === "session-query-volume",
  );
  const apiErrorMetric = metrics.data?.metrics.find(
    (metric) => metric.id === "api-error-rate",
  );
  const latencyMetric = metrics.data?.metrics.find(
    (metric) => metric.id === "end-to-end-latency-p95",
  );
  const workflowMetric = metrics.data?.metrics.find(
    (metric) => metric.id === "workflow-completion",
  );

  const adoptionSeries = toLineSeries(adoption.data);
  const adoptionStats =
    adoption.data?.supportingStats.flatMap((stat) => {
      if (stat.status !== "OK") {
        return [];
      }

      if (stat.id === "queries-per-session") {
        return [
          {
            id: stat.id,
            icon: <Person24Regular key="queries-per-session" aria-hidden="true" />,
            value: stat.value.toFixed(1),
            text: "queries/session",
            iconColor: "#4f46e5",
          },
        ];
      }

      if (stat.id === "avg-session-duration-minutes") {
        return [
          {
            id: stat.id,
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
      (stat.id === "retrieval-quality" || stat.id === "task-adherence")
        ? [
            {
              id: stat.id,
              value: `${stat.value.toFixed(1)} / 5`,
              text: itemLabels[stat.id],
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
                metrics.isPending ? (
                  <MetricStateValue>LOADING…</MetricStateValue>
                ) : metrics.isError ? (
                  <MetricStateValue>REQUEST FAILED</MetricStateValue>
                ) : sessionMetric?.status === "OK" &&
                  sessionMetric.id === "session-query-volume" ? (
                  <div className="text-[38px] leading-none font-semibold text-neutral-950">
                    {compactNumber.format(sessionMetric.queries)}{" "}
                    <span className="text-4xl font-normal">queries</span>
                  </div>
                ) : (
                  <MetricStateValue>{metricUnavailable(sessionMetric).label}</MetricStateValue>
                )
              }
              supportingContent={
                <MetricSupportingState>
                  {metrics.isPending
                    ? "Loading metric data"
                    : metrics.isError
                      ? requestErrorMessage(metrics.error)
                      : sessionMetric?.status === "OK" &&
                          sessionMetric.id === "session-query-volume"
                        ? `${compactNumber.format(sessionMetric.sessions)} sessions • ${sessionMetric.queriesPerSession.toFixed(1)} queries/session`
                        : metricUnavailable(sessionMetric).reason}
                </MetricSupportingState>
              }
            />
            <MetricCard
              icon={<ErrorCircle24Regular className="text-amber-700" />}
              title="API Error Rate"
              className="h-[170px] metricCard-warning"
              primaryContent={
                metrics.isPending ? (
                  <MetricStateValue>LOADING…</MetricStateValue>
                ) : metrics.isError ? (
                  <MetricStateValue>REQUEST FAILED</MetricStateValue>
                ) : apiErrorMetric?.status === "OK" && apiErrorMetric.id === "api-error-rate" ? (
                  <div className="text-[38px] leading-none font-semibold text-neutral-950">
                    {apiErrorMetric.errorRatePercent.toFixed(1)}%{" "}
                    <span className="text-4xl font-normal">errors</span>
                  </div>
                ) : (
                  <MetricStateValue>{metricUnavailable(apiErrorMetric).label}</MetricStateValue>
                )
              }
              supportingContent={
                <MetricSupportingState>
                  {metrics.isPending
                    ? "Loading metric data"
                    : metrics.isError
                      ? requestErrorMessage(metrics.error)
                      : apiErrorMetric?.status === "OK" && apiErrorMetric.id === "api-error-rate"
                        ? `${wholeNumber.format(apiErrorMetric.errorRequestCount)} errors • ${wholeNumber.format(apiErrorMetric.eligibleRequestCount)} eligible requests`
                        : metricUnavailable(apiErrorMetric).reason}
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
                ) : latencyMetric?.status === "OK" &&
                  latencyMetric.id === "end-to-end-latency-p95" ? (
                  <div className="text-[38px] leading-none font-semibold text-neutral-950">
                    P95{" "}
                    <span className="text-4xl font-normal">
                      {latencyMetric.seconds.toFixed(2)} s
                    </span>
                  </div>
                ) : (
                  <MetricStateValue>{metricUnavailable(latencyMetric).label}</MetricStateValue>
                )
              }
              supportingContent={
                metrics.isPending || metrics.isError || latencyMetric?.status !== "OK" ? (
                  <MetricSupportingState>
                    {metrics.isPending
                      ? "Loading metric data"
                      : metrics.isError
                        ? requestErrorMessage(metrics.error)
                        : metricUnavailable(latencyMetric).reason}
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
                ) : (
                  <MetricStateValue>{metricUnavailable(workflowMetric).label}</MetricStateValue>
                )
              }
              supportingContent={
                <MetricSupportingState>
                  {metrics.isPending
                    ? "Loading metric data"
                    : metrics.isError
                      ? requestErrorMessage(metrics.error)
                      : metricUnavailable(workflowMetric).reason}
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
            <div className="flex min-h-[300px] flex-col justify-center gap-4">
              <StatusCallout
                icon={<DataTrending24Regular aria-hidden="true" />}
                title="Channel Mix"
                primaryContent="DATA PENDING"
                variant="warning"
              />
              <p className="text-xs text-neutral-500">
                Channel Mix is not included in the current dashboard endpoint contract.
              </p>
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
