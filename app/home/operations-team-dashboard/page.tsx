"use client";

import { useState } from "react";
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
import DashboardSectionInfo, {
  type DashboardSectionInfoContent,
} from "@/components/shared/dashboard/DashboardSectionInfo";
import IllustrativeValuesBanner from "@/components/shared/dashboard/IllustrativeValuesBanner";
import PanelFootnote from "@/components/shared/dashboard/PanelFootnote";
import PendingStateValue from "@/components/shared/dashboard/PendingStateValue";
import StatusCallout from "@/components/shared/dashboard/StatusCallout";
import MetricList, {
  type MetricListItem,
} from "@/components/shared/dashboard/MetricList";
import { MetricCard } from "@/components/shared/dashboard/MetricCard";
import HorizontalBarList from "@/components/shared/charts/HorizontalBarList";
import DashboardSectionAction from "@/components/shared/dashboard/DashboardSectionAction";
import OperationalSituationDrawer from "@/components/drawers/operations/OperationalSituationDrawer";
import RequestedOperationsCoverageDrawer from "@/components/drawers/operations/RequestedOperationsCoverageDrawer";
import ServicePathStabilityDrawer from "@/components/drawers/operations/ServicePathStabilityDrawer";
import ServicePathRuntimeContextDrawer from "@/components/drawers/operations/ServicePathRuntimeContextDrawer";
import FailureSurfaceDrawer from "@/components/drawers/operations/FailureSurfaceDrawer";
import OperationalControlCoverageDrawer from "@/components/drawers/operations/OperationalControlCoverageDrawer";
import SafetyAndSecurityReadinessDrawer from "@/components/drawers/operations/SafetyAndSecurityReadinessDrawer";
import { useOperationsMainView } from "@/hooks/useOperationsDashboard";
import { useSelectedDashboardFilters } from "@/hooks/useSelectedDashboardFilters";
import type { MetricRow, Series } from "@/types/dashboard";
import operationsTeamSections from "@/content/dashboards/operations-team-sections.json";

const sectionInfo = operationsTeamSections as Record<
  string,
  DashboardSectionInfoContent
>;

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

/*
  The seven clickable sections from the approved clickability map. Service-path
  stability contributes two: its chart and its context list are separate
  elements that share a panel.
*/
type DrawerKey =
  | "operationalSituation"
  | "requestedOperationsCoverage"
  | "servicePathStabilityChart"
  | "servicePathRuntimeContext"
  | "failureSurface"
  | "operationalControlCoverage"
  | "safetyAndSecurityReadiness";

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
  const filters = useSelectedDashboardFilters();

  const [openDrawer, setOpenDrawer] = useState<DrawerKey | null>(null);
  const closeDrawer = () => setOpenDrawer(null);

  const { mainViewData: data } = useOperationsMainView(filters);

  const drawers = data?.drawers;

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

  /*
    Latency is plotted on the left axis in milliseconds; the two rates go on the
    right in percent. They are different units and never share a scale.
  */
  const situationSeries =
    data?.drawers.operationalSituation.series.map(
      (series: Series, index: number) => ({
        id: series.id,
        label: series.label,
        color: SERIES_COLORS[index],
        yAxis: index === 0 ? ("left" as const) : ("right" as const),
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
          template="segmented"
          title="Operational situation"
          className="xl:col-span-7"
          footer={
            <DashboardSectionInfo
              sectionTitle="Operational situation"
              content={sectionInfo["operational-situation"]}
            />
          }
          actions={
            <DashboardSectionAction
              onClick={() => setOpenDrawer("operationalSituation")}
              label="View operational situation details"
            />
          }
          sections={(data?.operationalSituation ?? []).map((row) => ({
            id: row.id,
          }))}
        >
          {(data?.operationalSituation ?? []).map((row) => (
            <MetricCard
              key={row.id}
              icon={SITUATION_ICONS[row.id]}
              title={row.label}
              primaryContent={
                row.pendingState ? (
                  <PendingStateValue
                    state={row.pendingState}
                    className="!whitespace-nowrap !text-xs !tracking-normal"
                  />
                ) : (
                  row.value
                )
              }
              minHeight="min-h-0"
              titleClassName="text-xs font-medium"
              valueClassName="whitespace-nowrap text-[22px] font-semibold leading-7"
              headerMinHeight="min-h-[40px]"
              pinSupporting
            />
          ))}
        </DashboardPanel>

        {/* Requirements with no reporting contract. Not zero values, and not
            live health indicators. */}
        <DashboardPanel
          template="single"
          title="Requested operations coverage"
          className="xl:col-span-5"
          footer={
            <DashboardSectionInfo
              sectionTitle="Requested operations coverage"
              content={sectionInfo["requested-operations-coverage"]}
            />
          }
          actions={
            <DashboardSectionAction
              onClick={() => setOpenDrawer("requestedOperationsCoverage")}
              label="View requested operations coverage details"
            />
          }
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {(data?.requestedOperationsCoverage ?? []).map((row) => (
              <StatusCallout
                key={row.id}
                icon={COVERAGE_ICONS[row.id]}
                title={row.label}
                variant="warning"
                size="compact"
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
            {
              id: "latency-trend",
              title: "Service-path stability",
              weight: 2,
              action: (
                <DashboardSectionAction
                  onClick={() => setOpenDrawer("servicePathStabilityChart")}
                  label="View service-path stability details"
                />
              ),
              footer: (
                <DashboardSectionInfo
                  sectionTitle="Service-path stability"
                  content={sectionInfo["service-path-stability"]}
                />
              ),
            },
            {
              id: "diagnostics",
              weight: 1,
              action: (
                <DashboardSectionAction
                  onClick={() => setOpenDrawer("servicePathRuntimeContext")}
                  label="View runtime context details"
                />
              ),
              footer: (
                <DashboardSectionInfo
                  sectionTitle="Service-path runtime context"
                  content={sectionInfo["service-path-runtime-context"]}
                />
              ),
            },
          ]}
        >
          <div>
            <DashboardLineChart
              series={latencySeries}
              axes={[{ id: "left", label: "Latency (ms)" }]}
              height={260}
            />
            {/* No glyph: the region's own info control is the only mark here
                that a reader can act on. */}
            <PanelFootnote icon={null}>
              Component times are not additive
            </PanelFootnote>
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
          footer={
            <DashboardSectionInfo
              sectionTitle="Failure surface"
              content={sectionInfo["failure-surface"]}
            />
          }
          actions={
            <DashboardSectionAction
              onClick={() => setOpenDrawer("failureSurface")}
              label="View failure surface details"
            />
          }
        >
          <HorizontalBarList
            values={data?.failureSurface.items ?? []}
            rowsPerColumn={3}
            columns={3}
            flow="row"
            max={data?.failureSurface.scaleMax ?? 2}
          />
          {/* No glyph: the panel's info control is the only mark here that
              a reader can act on. */}
          <PanelFootnote icon={null}>Illustrative rates</PanelFootnote>
        </DashboardPanel>

        {/* Readiness states only: no numeric aggregation is authorized here. */}
        <DashboardPanel
          template="single"
          title="Operational control coverage"
          className="xl:col-span-5"
          footer={
            <DashboardSectionInfo
              sectionTitle="Operational control coverage"
              content={sectionInfo["operational-control-coverage"]}
            />
          }
          actions={
            <DashboardSectionAction
              onClick={() => setOpenDrawer("operationalControlCoverage")}
              label="View operational control coverage details"
            />
          }
        >
          <MetricList
            items={toRows(data?.operationalControlCoverage ?? [], CONTROL_ICONS)}
          />
        </DashboardPanel>

        <DashboardPanel
          template="single"
          title="Safety and security readiness"
          className="xl:col-span-12"
          footer={
            <DashboardSectionInfo
              sectionTitle="Safety and security readiness"
              content={sectionInfo["safety-and-security-readiness"]}
            />
          }
          actions={
            <DashboardSectionAction
              onClick={() => setOpenDrawer("safetyAndSecurityReadiness")}
              label="View safety and security readiness details"
            />
          }
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

      {/* Detail drawers. One per clickable element; a drawer never merges two. */}

      <OperationalSituationDrawer
        open={openDrawer === "operationalSituation"}
        onClose={closeDrawer}
        content={drawers?.operationalSituation}
        series={situationSeries}
      />

      <RequestedOperationsCoverageDrawer
        open={openDrawer === "requestedOperationsCoverage"}
        onClose={closeDrawer}
        content={drawers?.requestedOperationsCoverage}
      />

      <ServicePathStabilityDrawer
        open={openDrawer === "servicePathStabilityChart"}
        onClose={closeDrawer}
        content={drawers?.servicePathStabilityChart}
        series={latencySeries}
      />

      <ServicePathRuntimeContextDrawer
        open={openDrawer === "servicePathRuntimeContext"}
        onClose={closeDrawer}
        content={drawers?.servicePathRuntimeContext}
        icons={DIAGNOSTIC_ICONS}
      />

      <FailureSurfaceDrawer
        open={openDrawer === "failureSurface"}
        onClose={closeDrawer}
        content={drawers?.failureSurface}
        items={data?.failureSurface.items ?? []}
        scaleMax={data?.failureSurface.scaleMax ?? 2}
      />

      <OperationalControlCoverageDrawer
        open={openDrawer === "operationalControlCoverage"}
        onClose={closeDrawer}
        content={drawers?.operationalControlCoverage}
      />

      <SafetyAndSecurityReadinessDrawer
        open={openDrawer === "safetyAndSecurityReadiness"}
        onClose={closeDrawer}
        content={drawers?.safetyAndSecurityReadiness}
        icons={SAFETY_ICONS}
      />
    </DashboardPage>
  );
}
