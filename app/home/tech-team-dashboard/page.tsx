"use client";

import { useState, type ReactNode } from "react";
import {
  ArrowTrendingLines24Regular,
  Warning24Regular,
  Clock24Regular,
  DatabaseSearch24Regular,
  ShieldCheckmark24Regular,
  Scales24Regular,
  LockClosed24Regular,
  ShieldTask24Regular,
} from "@fluentui/react-icons";

import DashboardPage from "@/components/shared/dashboard/DashboardPage";
import DashboardGrid from "@/components/shared/dashboard/DashboardGrid";
import DashboardPanel from "@/components/shared/dashboard/DashboardPanel";
import DashboardLineChart, {
  type DashboardLineSeries,
} from "@/components/shared/dashboard/DashboardLineChart";
import DashboardSectionInfo, {
  type DashboardSectionInfoContent,
} from "@/components/shared/dashboard/DashboardSectionInfo";
import MetricList, {
  type MetricListItem,
} from "@/components/shared/dashboard/MetricList";
import HorizontalBarList from "@/components/shared/charts/HorizontalBarList";
import IllustrativeValuesBanner from "@/components/shared/dashboard/IllustrativeValuesBanner";
import PendingStateValue from "@/components/shared/dashboard/PendingStateValue";
import DashboardSectionAction from "@/components/shared/dashboard/DashboardSectionAction";
import RequestPathLatencyDrawer from "@/components/shared/dashboard/drawers/tech-team/RequestPathLatencyDrawer";
import RequestPathDiagnosticsDrawer from "@/components/shared/dashboard/drawers/tech-team/RequestPathDiagnosticsDrawer";
import FailureLocalizationDrawer from "@/components/shared/dashboard/drawers/tech-team/FailureLocalizationDrawer";
import CapacityAndEfficiencyDrawer from "@/components/shared/dashboard/drawers/tech-team/CapacityAndEfficiencyDrawer";
import AiModelQualityDrawer from "@/components/shared/dashboard/drawers/tech-team/AiModelQualityDrawer";
import EvaluatorReadinessDrawer from "@/components/shared/dashboard/drawers/tech-team/EvaluatorReadinessDrawer";
import { useTechTeamMainView } from "@/hooks/useTechTeamDashboardEndpoints";
import { useSelectedDashboardFilters } from "@/hooks/useSelectedDashboardFilters";
import type { DrawerContent, MetricRow } from "@/types/dashboard";
import type {
  TechTeamDashboardAvailabilityStatus,
  TechTeamDashboardDrawerContent,
  TechTeamDashboardMetricRow,
  TechTeamDashboardMetricsPayload,
  TechTeamDashboardTimeseriesPayload,
} from "@/types/techTeamDashboard";
import techTeamSections from "@/content/dashboards/tech-team-sections.json";
import techTeamDashboardData from "@/public/mocks/new-pages/tech-team-dashboard.json";

const sectionInfo = techTeamSections as Record<
  string,
  DashboardSectionInfoContent
>;

/*
  Technical Teams main view.

  Presentation only. Every number on the page comes from the shared dashboard
  endpoints through useTechTeamMainView: one metrics request and one
  request per chart family, each with its own loading and error state. The
  metric panels read the metrics payload as returned and only format it.

  Drawer provenance — how a metric is produced and whether the selected scope
  applies to it — is not in that contract yet, so it stays on its mock file.
  The panel values a drawer repeats are the endpoint values the panels show,
  not a second copy from that file.

  The dashboard displays already aggregated results; it performs no metric
  calculation of its own. A metric without an approved value renders its
  explicit state and is never shown as zero.
*/

/*
  Chart presentation, keyed by the metricId a series arrives with. A metric
  keeps the same series colour everywhere it appears, so colours are assigned
  per series rather than by position: a series that is unavailable must not
  shift the colour of the ones that are.
*/
const seriesPresentation: Record<
  string,
  Pick<DashboardLineSeries, "label" | "color">
> = {
  "end-to-end-p95": { label: "End-to-End P95", color: "var(--color-chart-series-1)" },
  "model-response-average": {
    label: "Model Response avg",
    color: "var(--color-chart-series-2)",
  },
  "retrieval-average": { label: "Retrieval avg", color: "var(--color-chart-series-3)" },
  "tool-call-average": { label: "Tool Call avg", color: "var(--color-chart-series-4)" },
  groundedness: { label: "Groundedness", color: "var(--color-chart-series-1)" },
  "response-coherence": {
    label: "Response Coherence",
    color: "var(--color-chart-series-2)",
  },
  "relevance-quality": { label: "Relevance Quality", color: "var(--color-chart-series-3)" },
};

/*
  Retrieval Quality is a 1-5 period value and MLflow Correctness a 0-1 one.
  Both print their scale, because they sit beside a 1-5 chart and neither may
  be read against the other.
*/
const supportingPresentation: Record<
  string,
  { label: string; decimals: number; scale: number }
> = {
  "retrieval-quality": { label: "Retrieval Quality", decimals: 1, scale: 5 },
  "mlflow-correctness": { label: "MLflow Correctness", decimals: 2, scale: 1 },
};

const statusLabels: Record<TechTeamDashboardAvailabilityStatus, string> = {
  OK: "OK",
  DATA_PENDING: "DATA PENDING",
  CALCULATION_PENDING: "CALCULATION PENDING",
  FILTER_BREAKDOWN_UNAVAILABLE: "FILTER BREAKDOWN UNAVAILABLE",
  NO_DATA: "NO DATA",
  ERROR: "UNAVAILABLE",
};

const DIAGNOSTIC_ICONS: Record<string, ReactNode> = {
  "request-throughput": (
    <ArrowTrendingLines24Regular style={{ color: "var(--color-chart-series-1)" }} />
  ),
  "inference-error-rate": (
    <Warning24Regular style={{ color: "var(--color-warning-content)" }} />
  ),
  "pipeline-duration": (
    <Clock24Regular style={{ color: "var(--color-chart-series-4)" }} />
  ),
  "indexing-ai-services": (
    <DatabaseSearch24Regular style={{ color: "var(--color-chart-series-3)" }} />
  ),
};

const READINESS_ICONS: Record<string, ReactNode> = {
  "safety-evaluation-score": (
    <ShieldCheckmark24Regular style={{ color: "var(--color-success-icon)" }} />
  ),
  "mlflow-safety-score": (
    <Scales24Regular style={{ color: "var(--color-success-icon)" }} />
  ),
  "pii-leakage": (
    <LockClosed24Regular style={{ color: "var(--color-danger-icon)" }} />
  ),
  upia: <ShieldTask24Regular style={{ color: "var(--color-chart-series-2)" }} />,
};

/*
  The six clickable elements from the approved clickability map. The latency
  chart and the diagnostics list are separate keys even though they share the
  Request-path health panel.
*/
type DrawerKey =
  | "latencyChart"
  | "diagnostics"
  | "failureLocalization"
  | "capacityAndEfficiency"
  | "aiModelQuality"
  | "evaluatorReadiness";

// Formats a day key as the short axis label used in the approved design.
const formatDay = (value: string) =>
  new Date(`${value}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

const decimal = (value: number, digits: number) =>
  value.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

/* The display value for one fixture row: its prefix, amount, and unit. */
const formatAmount = (
  row: Omit<TechTeamDashboardMetricRow, "id" | "label" | "pendingState">,
) =>
  `${row.prefix ?? ""}${decimal(row.amount ?? 0, row.decimals ?? 0)}${row.unit ?? ""}`;

/*
  A pending state is never replaced by a number, and a row with no amount is
  pending data rather than zero.
*/
function toRow(row: TechTeamDashboardMetricRow): MetricRow {
  if (row.pendingState || row.amount === undefined) {
    return { id: row.id, label: row.label, pendingState: row.pendingState ?? "data" };
  }

  return { id: row.id, label: row.label, value: formatAmount(row) };
}

/* A drawer's provenance rows quote their latest amount, formatted like a row. */
function toDrawerContent(drawer: TechTeamDashboardDrawerContent): DrawerContent {
  return {
    ...drawer,
    contextRows: drawer.contextRows.map(
      ({ amount, unit, prefix, decimals, max, ...row }) => ({
        ...row,
        latest:
          amount === undefined
            ? undefined
            : formatAmount({ amount, unit, prefix, decimals, max }),
      }),
    ),
  };
}

const fixtureDrawers = (techTeamDashboardData as TechTeamDashboardMetricsPayload)
  .drawers;

const drawers: Record<DrawerKey, DrawerContent> = {
  latencyChart: toDrawerContent(fixtureDrawers.latencyChart),
  diagnostics: toDrawerContent(fixtureDrawers.diagnostics),
  failureLocalization: toDrawerContent(fixtureDrawers.failureLocalization),
  capacityAndEfficiency: toDrawerContent(fixtureDrawers.capacityAndEfficiency),
  aiModelQuality: toDrawerContent(fixtureDrawers.aiModelQuality),
  evaluatorReadiness: toDrawerContent(fixtureDrawers.evaluatorReadiness),
};

function toListItems(
  rows: MetricRow[],
  icons?: Record<string, ReactNode>,
): MetricListItem[] {
  return rows.map((row) => ({
    id: row.id,
    icon: icons?.[row.id],
    label: row.label,
    value: row.pendingState ? (
      <PendingStateValue state={row.pendingState} />
    ) : (
      (row.value ?? "")
    ),
  }));
}

function toLineSeries(
  chart: TechTeamDashboardTimeseriesPayload | undefined,
): DashboardLineSeries[] {
  if (!chart) {
    return [];
  }

  return chart.series.flatMap((item) => {
    const presentation = seriesPresentation[item.metricId];

    return item.status === "OK" && presentation
      ? [
          {
            id: item.metricId,
            ...presentation,
            points: item.points.map((point) => ({
              x: formatDay(point.x),
              y: point.y,
            })),
          },
        ]
      : [];
  });
}

function toSupporting(chart: TechTeamDashboardTimeseriesPayload | undefined) {
  return (chart?.supportingStats ?? []).flatMap((stat) => {
    const presentation = supportingPresentation[stat.metricId];

    return stat.status === "OK" && presentation
      ? [
          {
            id: stat.metricId,
            label: presentation.label,
            value: `${decimal(stat.value, presentation.decimals)} / ${presentation.scale}`,
          },
        ]
      : [];
  });
}

/*
  Names every series or supporting value the chart could not plot, with its
  status and reason, rather than letting it silently drop out.
*/
function ChartAvailabilityNotes({
  chart,
}: {
  chart: TechTeamDashboardTimeseriesPayload;
}) {
  const unavailable = [...chart.series, ...chart.supportingStats].filter(
    (item) => item.status !== "OK",
  );

  if (unavailable.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 space-y-1 text-xs" style={{ color: "var(--color-chart-axis)" }}>
      {unavailable.map((item) => (
        <div key={item.metricId}>
          <span className="font-semibold">
            {seriesPresentation[item.metricId]?.label ??
              supportingPresentation[item.metricId]?.label ??
              item.metricId}
            :
          </span>{" "}
          {statusLabels[item.status]}
          {"reason" in item ? ` — ${item.reason}` : null}
        </div>
      ))}
    </div>
  );
}

/*
  Renders a request's own loading, failure, or no-data state in place of its
  content. A response that arrived without this panel's section is pending
  data, not an empty panel.
*/
function RequestState({
  query,
  hasData = true,
  children,
}: {
  query: { isPending: boolean; isError: boolean; error: Error | null };
  hasData?: boolean;
  children: ReactNode;
}) {
  if (!query.isPending && !query.isError) {
    return hasData ? (
      <>{children}</>
    ) : (
      <div className="flex min-h-[120px] items-center justify-center px-4 text-center">
        <PendingStateValue state="data" />
      </div>
    );
  }

  return (
    <div
      className="flex min-h-[120px] items-center justify-center px-4 text-center text-sm"
      style={{ color: "var(--color-chart-axis)" }}
      role="status"
    >
      {query.isPending
        ? "Loading…"
        : (query.error?.message ?? "The endpoint request failed")}
    </div>
  );
}

export default function TechTeamDashboard() {
  /*
    The page opts in to the global filter bar: the selected scope is passed to
    the hooks, which key their caches on it, so changing a filter refetches for
    that scope.
  */
  const filters = useSelectedDashboardFilters();

  const { metrics, latency, quality } = useTechTeamMainView(filters);

  /*
    One drawer at a time. The six keys match the six clickable elements in the
    approved clickability map; the diagnostics list and the latency chart are
    separate entries because they are separate elements inside one panel.
  */
  const [openDrawer, setOpenDrawer] = useState<DrawerKey | null>(null);
  const closeDrawer = () => setOpenDrawer(null);

  /*
    The sections are read optionally: a source that has not mapped its rows onto
    this payload yet answers without them, and each panel then says its data is
    pending instead of the page failing.
  */
  const payload = metrics.data;
  const diagnosticRows = (payload?.requestPathHealth?.diagnostics ?? []).map(toRow);
  const capacityRows = (payload?.capacityAndEfficiency ?? []).map(toRow);
  const readinessRows = (payload?.evaluatorReadiness ?? []).map(toRow);

  // Eight independent rates, each with its own denominator; compared, never summed.
  const failureItems = payload?.failureLocalization?.items ?? [];
  const failureScaleMax = payload?.failureLocalization?.scaleMax ?? 0;

  const latencySeries = toLineSeries(latency.data);
  const qualitySeries = toLineSeries(quality.data);

  const qualitySupporting = toSupporting(quality.data);

  return (
    <DashboardPage
      title="AI Observability — Technical Teams Dashboard"
      description="Diagnose request paths, failures, evaluator quality, and capacity"
    >
      {/* No value on this page is measured yet: the fixture is illustrative and
          the Splunk source returns no mapped values. */}
      <IllustrativeValuesBanner />

      <DashboardGrid columns={12}>
        {/* Request-path health: latency trend beside independent diagnostics. */}
        <DashboardPanel
          template="segmented"
          title="Request-path health"
          className="xl:col-span-12"
          sections={[
            {
              id: "latency-trend",
              title: "Request-path health",
              weight: 2,
              action: (
                <DashboardSectionAction
                  onClick={() => setOpenDrawer("latencyChart")}
                  label="View request-path latency details"
                />
              ),
              footer: (
                <DashboardSectionInfo
                  sectionTitle="Request-path health"
                  content={sectionInfo["request-path-health"]}
                />
              ),
            },
            {
              id: "diagnostics",
              weight: 1,
              action: (
                <DashboardSectionAction
                  onClick={() => setOpenDrawer("diagnostics")}
                  label="View request-path diagnostics details"
                />
              ),
              footer: (
                <DashboardSectionInfo
                  sectionTitle="Request-path diagnostics"
                  content={sectionInfo["request-path-diagnostics"]}
                />
              ),
            },
          ]}
        >
          <div>
            <RequestState query={latency} hasData={Boolean(latency.data)}>
              <DashboardLineChart
                series={latencySeries}
                axes={[{ id: "left", label: "Latency (ms)" }]}
                height={260}
              />
              {latency.data && <ChartAvailabilityNotes chart={latency.data} />}
            </RequestState>
          </div>

          <div>
            <RequestState query={metrics} hasData={diagnosticRows.length > 0}>
              <MetricList
                variant="prominent"
                items={toListItems(diagnosticRows, DIAGNOSTIC_ICONS)}
              />
            </RequestState>
          </div>
        </DashboardPanel>

        {/* Eight workload-specific rates. Each has its own denominator; they
            are compared, never summed. */}
        <DashboardPanel
          template="single"
          title="Failure localization"
          className="xl:col-span-7"
          footer={
            <DashboardSectionInfo
              sectionTitle="Failure localization"
              content={sectionInfo["failure-localization"]}
            />
          }
          actions={
            <DashboardSectionAction
              onClick={() => setOpenDrawer("failureLocalization")}
              label="View failure localization details"
            />
          }
        >
          <RequestState query={metrics} hasData={failureItems.length > 0}>
            <HorizontalBarList
              values={failureItems}
              rowsPerColumn={4}
              max={failureScaleMax}
            />
          </RequestState>
        </DashboardPanel>

        <DashboardPanel
          template="single"
          title="Capacity and efficiency"
          className="xl:col-span-5"
          footer={
            <DashboardSectionInfo
              sectionTitle="Capacity and efficiency"
              content={sectionInfo["capacity-and-efficiency"]}
            />
          }
          actions={
            <DashboardSectionAction
              onClick={() => setOpenDrawer("capacityAndEfficiency")}
              label="View capacity and efficiency details"
            />
          }
        >
          <RequestState query={metrics} hasData={capacityRows.length > 0}>
            <MetricList items={toListItems(capacityRows)} />
          </RequestState>
        </DashboardPanel>

        {/* Three compatible 1-5 evaluator series. The 0-1 MLflow measure stays
            off this axis and is shown as a separate supporting value. */}
        <DashboardPanel
          template="single"
          title="AI and model quality"
          className="xl:col-span-7"
          footer={
            <DashboardSectionInfo
              sectionTitle="AI and model quality"
              content={sectionInfo["ai-and-model-quality"]}
            />
          }
          actions={
            <DashboardSectionAction
              onClick={() => setOpenDrawer("aiModelQuality")}
              label="View AI and model quality details"
            />
          }
        >
          <RequestState query={quality} hasData={Boolean(quality.data)}>
            <DashboardLineChart
              series={qualitySeries}
              axes={[{ id: "left", domain: [1, 5] }]}
              height={220}
              supportingStatsTemplate="right"
              supportingStats={qualitySupporting.map((stat) => ({
                id: stat.id,
                value: stat.value,
                text: stat.label,
              }))}
            />
            {quality.data && <ChartAvailabilityNotes chart={quality.data} />}
          </RequestState>

          {/*
            Shown because the approved design includes it, and deliberately not
            interactive: the clickability map records that no detail view for
            "View all quality evaluations" is approved yet.
          */}
          <div
            className="pt-2 text-right text-xs font-medium"
            style={{ color: "var(--color-chart-axis)" }}
          >
            View all quality evaluations →
          </div>
        </DashboardPanel>

        <DashboardPanel
          template="single"
          title="Evaluator readiness and security tests"
          className="xl:col-span-5"
          footer={
            <DashboardSectionInfo
              sectionTitle="Evaluator readiness and security tests"
              content={sectionInfo["evaluator-readiness"]}
            />
          }
          actions={
            <DashboardSectionAction
              onClick={() => setOpenDrawer("evaluatorReadiness")}
              label="View evaluator readiness details"
            />
          }
        >
          <RequestState query={metrics} hasData={readinessRows.length > 0}>
            <MetricList
              variant="prominent"
              items={toListItems(readinessRows, READINESS_ICONS)}
            />
          </RequestState>
        </DashboardPanel>
      </DashboardGrid>

      {/* Detail drawers. Each deepens exactly one main-view element, and shows
          the same values the element behind it shows. */}

      <RequestPathLatencyDrawer
        open={openDrawer === "latencyChart"}
        onClose={closeDrawer}
        content={drawers.latencyChart}
        series={latencySeries}
      />

      <RequestPathDiagnosticsDrawer
        open={openDrawer === "diagnostics"}
        onClose={closeDrawer}
        content={drawers.diagnostics}
        diagnostics={diagnosticRows}
        icons={DIAGNOSTIC_ICONS}
      />

      <FailureLocalizationDrawer
        open={openDrawer === "failureLocalization"}
        onClose={closeDrawer}
        content={drawers.failureLocalization}
        items={failureItems}
        scaleMax={failureScaleMax}
      />

      <CapacityAndEfficiencyDrawer
        open={openDrawer === "capacityAndEfficiency"}
        onClose={closeDrawer}
        content={drawers.capacityAndEfficiency}
        rows={capacityRows}
      />

      <AiModelQualityDrawer
        open={openDrawer === "aiModelQuality"}
        onClose={closeDrawer}
        content={drawers.aiModelQuality}
        series={qualitySeries}
        supporting={qualitySupporting}
      />

      <EvaluatorReadinessDrawer
        open={openDrawer === "evaluatorReadiness"}
        onClose={closeDrawer}
        content={drawers.evaluatorReadiness}
        rows={readinessRows}
        icons={READINESS_ICONS}
      />
    </DashboardPage>
  );
}
