"use client";

import {
  Alert24Regular,
  ArrowSync24Regular,
  ArrowTrendingLines24Regular,
  Clock24Regular,
  DatabaseSearch24Regular,
  DocumentBulletList24Regular,
  Building24Regular,
  LeafOne24Regular,
  LockClosed24Regular,
  Scales24Regular,
  ShieldCheckmark24Regular,
  ShieldTask24Regular,
  Toolbox24Regular,
  Warning24Regular,
  Beaker24Regular,
  DesktopPulse24Regular,
  TopSpeed24Regular,
} from "@fluentui/react-icons";

import DashboardPage from "@/components/shared/dashboard/DashboardPage";
import DashboardGrid from "@/components/shared/dashboard/DashboardGrid";
import DashboardPanel from "@/components/shared/dashboard/DashboardPanel";
import DashboardLineChart from "@/components/shared/dashboard/DashboardLineChart";
import IllustrativeValuesBanner from "@/components/shared/dashboard/IllustrativeValuesBanner";
import PanelFootnote from "@/components/shared/dashboard/PanelFootnote";
import PendingStateValue from "@/components/shared/dashboard/PendingStateValue";
import StatusCallout from "@/components/shared/dashboard/StatusCallout";
import MetricList, {
  type MetricListItem,
} from "@/components/shared/dashboard/MetricList";
import { MetricCard } from "@/components/shared/dashboard/MetricCard";
import HorizontalBarList from "@/components/shared/charts/HorizontalBarList";
import { useOperationsMainView } from "@/hooks/useOperationsDashboard";
import { useDashboardFiltersStore } from "@/store/dashboardFiltersStore";
import type { MetricRow, Series } from "@/types/dashboard";

/*
  Operations Team main view.

  Presentation only. The payload comes from the main-view endpoint through
  useOperationsMainView, so this file is unaffected by where the data originates.
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

const SITUATION_ICONS: Record<string, React.ReactNode> = {
  "end-to-end-latency": (
    <ArrowSync24Regular style={{ color: "var(--color-success-icon)" }} />
  ),
  "api-error-rate": (
    <Warning24Regular style={{ color: "var(--color-warning-content)" }} />
  ),
  "pipeline-failure-rate": (
    <Beaker24Regular style={{ color: "var(--color-chart-series-2)" }} />
  ),
  "alert-feed": (
    <Alert24Regular style={{ color: "var(--color-danger-icon)" }} />
  ),
};

const COVERAGE_ICONS: Record<string, React.ReactNode> = {
  "uptime-sla": <ShieldCheckmark24Regular />,
  "cpu-memory": <DesktopPulse24Regular />,
  "system-load": <TopSpeed24Regular />,
};

const DIAGNOSTIC_ICONS: Record<string, React.ReactNode> = {
  "request-throughput": (
    <ArrowTrendingLines24Regular style={{ color: "var(--color-chart-series-1)" }} />
  ),
  "pipeline-duration": (
    <Clock24Regular style={{ color: "var(--color-chart-series-4)" }} />
  ),
  "indexing-ai-services": (
    <DatabaseSearch24Regular style={{ color: "var(--color-chart-series-3)" }} />
  ),
  "token-throughput": (
    <TopSpeed24Regular style={{ color: "var(--color-chart-series-2)" }} />
  ),
};

const CONTROL_ICONS: Record<string, React.ReactNode> = {
  "training-reproducibility": (
    <ShieldCheckmark24Regular style={{ color: "var(--color-chart-axis)" }} />
  ),
  "audit-logging": (
    <DocumentBulletList24Regular style={{ color: "var(--color-success-icon)" }} />
  ),
  "tool-usage-compliance": (
    <Toolbox24Regular style={{ color: "var(--color-chart-series-1)" }} />
  ),
  "model-governance": (
    <Building24Regular style={{ color: "var(--color-chart-series-2)" }} />
  ),
  "environment-compliance": (
    <LeafOne24Regular style={{ color: "var(--color-success-icon)" }} />
  ),
};

const SAFETY_ICONS: Record<string, React.ReactNode> = {
  "safety-evaluation-score": <ShieldCheckmark24Regular />,
  "mlflow-safety-score": <Scales24Regular />,
  "pii-leakage": <LockClosed24Regular />,
  upia: <ShieldTask24Regular />,
};

// Formats a day key as the short axis label used in the approved design.
const formatDay = (value: string) =>
  new Date(`${value}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

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

export default function OperationsTeamDashboard() {
  /*
    The page opts in to the global filter bar: the selected scope is passed to
    the hook, which keys its cache on it, so changing a filter refetches the
    payload for that scope.
  */
  const period = useDashboardFiltersStore((state) => state.period);
  const businessUnit = useDashboardFiltersStore((state) => state.businessUnit);
  const project = useDashboardFiltersStore((state) => state.project);
  const channel = useDashboardFiltersStore((state) => state.channel);

  const { mainViewData: data } = useOperationsMainView({
    period,
    businessUnit,
    project,
    channel,
  });

  const latencySeries =
    data?.servicePathStability.latencySeries.map(
      (series: Series, index: number) => ({
        id: series.id,
        label: series.label,
        color: SERIES_COLORS[index],
        points: series.points.map((point) => ({
          x: formatDay(point.x),
          y: point.y,
        })),
      }),
    ) ?? [];

  return (
    <DashboardPage
      title="AI Observability — Operations Team Dashboard"
      description="Monitor stability, incident response, and operational readiness"
    >
      <IllustrativeValuesBanner />

      <DashboardGrid columns={12}>
        {/* Measured stability signals. The alert feed has no approved threshold,
            so it reports that rather than a count. */}
        <DashboardPanel
          template="single"
          title="Operational situation"
          className="xl:col-span-8"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {(data?.operationalSituation ?? []).map((row) => (
              <MetricCard
                key={row.id}
                icon={SITUATION_ICONS[row.id]}
                title={row.label}
                primaryContent={
                  row.pendingState ? (
                    <PendingStateValue state={row.pendingState} />
                  ) : (
                    row.value
                  )
                }
                className="rounded-lg border border-chart-grid"
                minHeight="min-h-0"
                titleClassName="text-xs font-medium"
                valueClassName="text-2xl font-semibold"
              />
            ))}
          </div>
        </DashboardPanel>

        {/* Requirements with no reporting contract. Not zero values, and not
            live health indicators. */}
        <DashboardPanel
          template="single"
          title="Requested operations coverage"
          className="xl:col-span-4"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {(data?.requestedOperationsCoverage ?? []).map((row) => (
              <StatusCallout
                key={row.id}
                icon={COVERAGE_ICONS[row.id]}
                title={row.label}
                variant="warning"
                primaryContent={
                  row.pendingState ? (
                    <PendingStateValue state={row.pendingState} />
                  ) : (
                    row.value
                  )
                }
              />
            ))}
          </div>
        </DashboardPanel>

        {/* Latency trend beside independent operational context. */}
        <DashboardPanel
          template="segmented"
          title="Service-path stability"
          className="xl:col-span-12"
          sections={[
            { id: "latency-trend", title: "Service-path stability", weight: 2 },
            { id: "diagnostics", weight: 1 },
          ]}
        >
          <div>
            <DashboardLineChart
              series={latencySeries}
              axes={[{ id: "left", label: "Latency (ms)" }]}
              height={260}
            />
            <PanelFootnote>Component times are not additive</PanelFootnote>
          </div>

          <MetricList
            variant="prominent"
            items={toRows(
              data?.servicePathStability.diagnostics ?? [],
              DIAGNOSTIC_ICONS,
            )}
          />
        </DashboardPanel>

        {/* Nine workload-specific rates. Each has its own denominator; they are
            compared, never summed. */}
        <DashboardPanel
          template="single"
          title="Failure surface"
          className="xl:col-span-7"
        >
          <HorizontalBarList
            values={data?.failureSurface.items ?? []}
            rowsPerColumn={3}
            columns={3}
            flow="row"
            max={data?.failureSurface.scaleMax ?? 2}
          />
          <PanelFootnote>Illustrative rates</PanelFootnote>
        </DashboardPanel>

        {/* Readiness states only: no numeric aggregation is authorized here. */}
        <DashboardPanel
          template="single"
          title="Operational control coverage"
          className="xl:col-span-5"
        >
          <MetricList
            items={toRows(data?.operationalControlCoverage ?? [], CONTROL_ICONS)}
          />
        </DashboardPanel>

        <DashboardPanel
          template="single"
          title="Safety and security readiness"
          className="xl:col-span-12"
        >
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {(data?.safetyAndSecurityReadiness ?? []).map((row) => (
              <StatusCallout
                key={row.id}
                icon={SAFETY_ICONS[row.id]}
                title={row.label}
                variant={row.pendingState ? "warning" : "success"}
                primaryContent={
                  row.pendingState ? (
                    <PendingStateValue state={row.pendingState} />
                  ) : (
                    row.value
                  )
                }
              />
            ))}
          </div>
        </DashboardPanel>
      </DashboardGrid>
    </DashboardPage>
  );
}
