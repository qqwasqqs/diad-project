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
import DashboardLineChart from "@/components/shared/dashboard/DashboardLineChart";
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
import { useTechTeamMainView as useLegacyTechTeamMainView } from "@/hooks/useTechTeamDashboard";
import { useTechTeamMainView } from "@/hooks/useTechTeamDashboardEndpoints";
import { useSelectedDashboardFilters } from "@/hooks/useSelectedDashboardFilters";
import type { MetricRow, Series } from "@/types/dashboard";
import type { TechTeamDashboardMetricRow } from "@/types/techTeamDashboard";
import techTeamSections from "@/content/dashboards/tech-team-sections.json";

const sectionInfo = techTeamSections as Record<
  string,
  DashboardSectionInfoContent
>;

/*
  Technical Teams main view.

  Presentation only. The metric panels read the metrics payload from the
  dashboard endpoints through useTechTeamMainView and only format it.
  The dashboard displays already aggregated results; it performs no metric
  calculation of its own. Metrics without an approved definition render an
  explicit pending state and are never shown as zero.
*/

// A metric keeps the same series color everywhere it appears.
const SERIES_COLORS = [
  "var(--color-chart-series-1)",
  "var(--color-chart-series-2)",
  "var(--color-chart-series-3)",
  "var(--color-chart-series-4)",
];

const DIAGNOSTIC_ICONS: Record<string, React.ReactNode> = {
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

const READINESS_ICONS: Record<string, React.ReactNode> = {
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

/* The display value for one fixture row: its prefix, amount, and unit. */
const formatAmount = (
  row: Omit<TechTeamDashboardMetricRow, "id" | "label" | "pendingState">,
) =>
  `${row.prefix ?? ""}${(row.amount ?? 0).toFixed(row.decimals ?? 0)}${row.unit ?? ""}`;

/*
  A pending state is never replaced by a number, and a row without an amount is
  pending data, not zero.
*/
function toMetricRow(row: TechTeamDashboardMetricRow): MetricRow {
  if (row.pendingState || row.amount === undefined) {
    return {
      id: row.id,
      label: row.label,
      pendingState: row.pendingState ?? "data",
    };
  }

  return { id: row.id, label: row.label, value: formatAmount(row) };
}

function MetricStateValue({ children }: { children: ReactNode }) {
  return (
    <div
      className="flex min-h-[120px] items-center justify-center px-4 text-center text-sm font-semibold"
      style={{ color: "var(--color-chart-axis)" }}
      role="status"
    >
      {children}
    </div>
  );
}

/*
  Renders the metrics request's loading, failure, or no-data state in place of
  a panel's content.
*/
function MetricsRequestState({
  query,
  hasData,
  children,
}: {
  query: { isPending: boolean; isError: boolean };
  hasData: boolean;
  children: ReactNode;
}) {
  return query.isPending ? (
    <MetricStateValue>LOADING…</MetricStateValue>
  ) : query.isError ? (
    <MetricStateValue>REQUEST FAILED</MetricStateValue>
  ) : hasData ? (
    <>{children}</>
  ) : (
    <MetricStateValue>
      <PendingStateValue state="data" />
    </MetricStateValue>
  );
}

const toRows = (
  rows: MetricRow[],
  icons?: Record<string, React.ReactNode>,
): MetricListItem[] =>
  rows.map((row) => ({
    id: row.id,
    icon: icons?.[row.id],
    label: row.label,
    value: row.pendingState ? (
      <PendingStateValue state={row.pendingState} />
    ) : (
      row.value ?? ""
    ),
  }));

export default function TechTeamDashboard() {
  /*
    The page opts in to the global filter bar: the selected scope is passed to
    the hook, which keys its cache on it, so changing a filter refetches the
    payload for that scope.
  */
  const filters = useSelectedDashboardFilters();

  const { metrics } = useTechTeamMainView(filters);
  // Charts and drawer provenance until they move off the legacy route.
  const { mainViewData: data } = useLegacyTechTeamMainView(filters);

  /*
    Sections are read optionally: a source that has not mapped its rows onto
    this payload answers without them, and each panel then says its data is
    pending instead of the page failing.
  */
  const payload = metrics.data;
  const diagnosticRows = (payload?.requestPathHealth?.diagnostics ?? []).map(
    toMetricRow,
  );
  const capacityRows = (payload?.capacityAndEfficiency ?? []).map(toMetricRow);
  const readinessRows = (payload?.evaluatorReadiness ?? []).map(toMetricRow);
  const failureItems = payload?.failureLocalization?.items ?? [];
  const failureScaleMax = payload?.failureLocalization?.scaleMax ?? 0;

  /*
    One drawer at a time. The six keys match the six clickable elements in the
    approved clickability map; the diagnostics list and the latency chart are
    separate entries because they are separate elements inside one panel.
  */
  const [openDrawer, setOpenDrawer] = useState<DrawerKey | null>(null);
  const closeDrawer = () => setOpenDrawer(null);
  const drawers = data?.drawers;

  const latencySeries =
    data?.requestPathHealth.latencySeries.map((series: Series, index: number) => ({
      id: series.id,
      label: series.label,
      color: SERIES_COLORS[index],
      points: series.points.map((point) => ({
        x: formatDay(point.x),
        y: point.y,
      })),
    })) ?? [];

  const qualitySeries =
    data?.aiModelQuality.series.map((series: Series, index: number) => ({
      id: series.id,
      label: series.label,
      color: SERIES_COLORS[index],
      points: series.points.map((point) => ({
        x: formatDay(point.x),
        y: point.y,
      })),
    })) ?? [];

  return (
    <DashboardPage
      title="AI Observability — Technical Teams Dashboard"
      description="Diagnose request paths, failures, evaluator quality, and capacity"
    >
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
          <DashboardLineChart
            series={latencySeries}
            axes={[{ id: "left", label: "Latency (ms)" }]}
            height={260}
          />

          <MetricsRequestState query={metrics} hasData={diagnosticRows.length > 0}>
            <MetricList
              variant="prominent"
              items={toRows(diagnosticRows, DIAGNOSTIC_ICONS)}
            />
          </MetricsRequestState>
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
          <MetricsRequestState query={metrics} hasData={failureItems.length > 0}>
            <HorizontalBarList
              values={failureItems}
              rowsPerColumn={4}
              max={failureScaleMax}
            />
          </MetricsRequestState>
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
          <MetricsRequestState query={metrics} hasData={capacityRows.length > 0}>
            <MetricList items={toRows(capacityRows)} />
          </MetricsRequestState>
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
          <DashboardLineChart
            series={qualitySeries}
            axes={[{ id: "left", domain: [1, 5] }]}
            height={220}
            supportingStatsTemplate="right"
            supportingStats={(data?.aiModelQuality.supporting ?? []).map(
              (stat) => ({
                id: stat.id,
                value: stat.value,
                text: stat.label,
              }),
            )}
          />

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
          <MetricsRequestState query={metrics} hasData={readinessRows.length > 0}>
            <MetricList
              variant="prominent"
              items={toRows(readinessRows, READINESS_ICONS)}
            />
          </MetricsRequestState>
        </DashboardPanel>
      </DashboardGrid>

      {/* Detail drawers. Each deepens exactly one main-view element. */}

      <RequestPathLatencyDrawer
        open={openDrawer === "latencyChart"}
        onClose={closeDrawer}
        content={drawers?.latencyChart}
        series={latencySeries}
      />

      <RequestPathDiagnosticsDrawer
        open={openDrawer === "diagnostics"}
        onClose={closeDrawer}
        content={drawers?.diagnostics}
        diagnostics={diagnosticRows}
        icons={DIAGNOSTIC_ICONS}
      />

      <FailureLocalizationDrawer
        open={openDrawer === "failureLocalization"}
        onClose={closeDrawer}
        content={drawers?.failureLocalization}
        items={failureItems}
        scaleMax={failureScaleMax}
      />

      <CapacityAndEfficiencyDrawer
        open={openDrawer === "capacityAndEfficiency"}
        onClose={closeDrawer}
        content={drawers?.capacityAndEfficiency}
        rows={capacityRows}
      />

      <AiModelQualityDrawer
        open={openDrawer === "aiModelQuality"}
        onClose={closeDrawer}
        content={drawers?.aiModelQuality}
        series={qualitySeries}
        supporting={data?.aiModelQuality.supporting ?? []}
      />

      <EvaluatorReadinessDrawer
        open={openDrawer === "evaluatorReadiness"}
        onClose={closeDrawer}
        content={drawers?.evaluatorReadiness}
        rows={readinessRows}
        icons={READINESS_ICONS}
      />
    </DashboardPage>
  );
}
