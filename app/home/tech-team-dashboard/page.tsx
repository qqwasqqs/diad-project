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
import { pendingStateForStatus } from "@/lib/dashboard/availabilityState";
import { useTechTeamMainViewEndpoints } from "@/hooks/useTechTeamDashboardEndpoints";
import { useTechTeamMainView } from "@/hooks/useTechTeamDashboard";
import { useSelectedDashboardFilters } from "@/hooks/useSelectedDashboardFilters";
import type { MetricRow, PendingState } from "@/types/dashboard";
import type { TechTeamMetricId } from "@/types/dashboardEndpointDtos";
import type {
  TechTeamChartModel,
  TechTeamMetricModel,
} from "@/types/techTeamDashboardModels";
import techTeamSections from "@/content/dashboards/tech-team-sections.json";

const sectionInfo = techTeamSections as Record<
  string,
  DashboardSectionInfoContent
>;

/*
  Technical Teams main view.

  Presentation only. Every number on the page comes from the shared dashboard
  endpoints through useTechTeamMainViewEndpoints: one metrics request and one
  request per chart family, each with its own loading and error state.

  Drawer provenance — how a metric is produced and whether the selected scope
  applies to it — is not in that contract yet, so it still comes from the
  combined main-view route. The values the drawers show are the endpoint values
  the panels show, not a second copy from that route, so the two surfaces cannot
  state different numbers for one metric.

  The dashboard displays already aggregated results; it performs no metric
  calculation of its own. A metric without an approved value renders its
  explicit state and is never shown as zero.
*/

/*
  A metric keeps the same series colour everywhere it appears, so colours are
  assigned per series ID rather than by position: a series that is unavailable
  must not shift the colour of the ones that are.
*/
const SERIES_COLORS: Record<string, string> = {
  "end-to-end-p95": "var(--color-chart-series-1)",
  "model-response-average": "var(--color-chart-series-2)",
  "retrieval-average": "var(--color-chart-series-3)",
  "tool-call-average": "var(--color-chart-series-4)",
  groundedness: "var(--color-chart-series-1)",
  "response-coherence": "var(--color-chart-series-2)",
  "relevance-quality": "var(--color-chart-series-3)",
};

const SERIES_LABELS: Record<string, string> = {
  "end-to-end-p95": "End-to-End P95",
  "model-response-average": "Model Response avg",
  "retrieval-average": "Retrieval avg",
  "tool-call-average": "Tool Call avg",
  groundedness: "Groundedness",
  "response-coherence": "Response Coherence",
  "relevance-quality": "Relevance Quality",
  "retrieval-quality": "Retrieval Quality",
  "mlflow-correctness": "MLflow Correctness",
};

/*
  The approved label for each metric. These live here rather than travelling
  with the values: a label is presentation, and the endpoint returns identifiers
  and numbers.
*/
const METRIC_LABELS: Record<TechTeamMetricId, string> = {
  "request-throughput": "Request Throughput",
  "inference-error-rate": "Inference Error Rate",
  "pipeline-duration-average": "Pipeline Duration avg",
  "indexing-ai-services-latency-average": "Indexing / AI Services avg",
  "failure-rate-pipeline": "Pipeline",
  "failure-rate-job": "Job",
  "failure-rate-inference": "Inference",
  "failure-rate-api-service": "API Service",
  "failure-rate-training": "Training",
  "failure-rate-indexing": "Indexing",
  "failure-rate-transcription": "Transcription",
  "failure-rate-translation": "Translation",
  "cost-per-request": "Cost per Request",
  "token-usage-per-request": "Token Usage / Request",
  "token-throughput": "Token Throughput",
  "available-token-limit": "Available Token Limit",
  "cache-hit-ratio": "Cache Hit Ratio",
  "safety-evaluation-score": "Safety Evaluation Score",
  "mlflow-safety-score": "MLflow Safety Score",
  "pii-leakage-agent-only": "PII Leakage (Agent Only)",
  upia: "UPIA",
};

const DIAGNOSTIC_IDS: TechTeamMetricId[] = [
  "request-throughput",
  "inference-error-rate",
  "pipeline-duration-average",
  "indexing-ai-services-latency-average",
];

const FAILURE_RATE_IDS: TechTeamMetricId[] = [
  "failure-rate-pipeline",
  "failure-rate-job",
  "failure-rate-inference",
  "failure-rate-api-service",
  "failure-rate-training",
  "failure-rate-indexing",
  "failure-rate-transcription",
  "failure-rate-translation",
];

const CAPACITY_IDS: TechTeamMetricId[] = [
  "cost-per-request",
  "token-usage-per-request",
  "token-throughput",
  "available-token-limit",
  "cache-hit-ratio",
];

const READINESS_IDS: TechTeamMetricId[] = [
  "safety-evaluation-score",
  "mlflow-safety-score",
  "pii-leakage-agent-only",
  "upia",
];

const DIAGNOSTIC_ICONS: Record<string, ReactNode> = {
  "request-throughput": (
    <ArrowTrendingLines24Regular style={{ color: "var(--color-chart-series-1)" }} />
  ),
  "inference-error-rate": (
    <Warning24Regular style={{ color: "var(--color-warning-content)" }} />
  ),
  "pipeline-duration-average": (
    <Clock24Regular style={{ color: "var(--color-chart-series-4)" }} />
  ),
  "indexing-ai-services-latency-average": (
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
  "pii-leakage-agent-only": (
    <LockClosed24Regular style={{ color: "var(--color-danger-icon)" }} />
  ),
  upia: <ShieldTask24Regular style={{ color: "var(--color-chart-series-2)" }} />,
};

/*
  The approved display label for a measure the endpoint can only report as
  CALCULATION_PENDING.

  The shared status vocabulary has no DEFINITION_PENDING, FORMULA_PENDING, or
  TEST_RESULTS_PENDING code, and the Technical Teams data contract says so
  explicitly: the source returns CALCULATION_PENDING with a precise reason, and
  the UI maps it back to the label the approved design specifies. Each entry
  below is the Display value recorded in that metric's calculation document.

  It applies only to CALCULATION_PENDING. A metric that comes back NO_DATA, in
  error, or unattributable to the selected scope says that instead — those are
  different facts and must not be relabelled as a pending definition.
*/
const APPROVED_CALCULATION_LABEL: Partial<Record<TechTeamMetricId, PendingState>> = {
  "token-throughput": "definition",
  "available-token-limit": "definition",
  "cache-hit-ratio": "formula",
  upia: "test-results",
};

/*
  Upper bound of the failure-rate track. The bars compare small rates against
  each other, so the bound is a presentation choice rather than a measurement:
  the data contract defines no scale for them. It widens if a measured rate
  would otherwise overflow it.
*/
const FAILURE_RATE_TRACK_MIN = 2;

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

/*
  A row ready to render. `reason` is why a state was returned; it is announced
  to screen readers beside the state, because the state alone says that a value
  is missing but not what is missing.
*/
interface TechTeamRow extends MetricRow {
  reason?: string;
}

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

/*
  Durations arrive in milliseconds, which is the contract's common unit but not
  always the readable one: a pipeline run is read in seconds, a retrieval call
  in milliseconds.
*/
const formatDuration = (milliseconds: number) =>
  milliseconds >= 1000
    ? `${decimal(milliseconds / 1000, 0)} s`
    : `${decimal(milliseconds, 0)} ms`;

const formatTokens = (tokens: number) =>
  tokens >= 1000 ? `${decimal(tokens / 1000, 1)}K tokens` : `${decimal(tokens, 0)} tokens`;

const formatCost = (amount: number, currencyCode: string) =>
  amount.toLocaleString("en-US", {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/* The display value for one measured metric. */
function formatMetric(metric: Extract<TechTeamMetricModel, { status: "OK" }>): string {
  switch (metric.id) {
    case "request-throughput":
      return `${decimal(metric.throughputRequestsPerSecond, 1)} req/s`;
    case "inference-error-rate":
      return `${decimal(metric.errorRatePercent, 2)}%`;
    case "pipeline-duration-average":
      return formatDuration(metric.averageDurationMs);
    case "indexing-ai-services-latency-average":
      return formatDuration(metric.averageLatencyMs);
    case "cost-per-request":
      return formatCost(metric.averageCostPerRequest, metric.currencyCode);
    case "token-usage-per-request":
      return formatTokens(metric.averageTokensPerRequest);
    case "mlflow-safety-score":
      // The 0-1 scale is printed with the value so it cannot be read as a percentage.
      return `${decimal(metric.mlflowSafetyScore, 2)} / ${metric.scaleMax}`;
    default:
      // A failure rate, which is compared against the other seven, not read alone.
      return `${decimal(metric.failureRatePercent, 2)}%`;
  }
}

function toRow(id: TechTeamMetricId, metric?: TechTeamMetricModel): TechTeamRow {
  const label = METRIC_LABELS[id];

  if (!metric) {
    return {
      id,
      label,
      pendingState: "unavailable",
      reason: "The metric was not returned by the endpoint",
    };
  }

  if (metric.status === "OK") {
    return { id, label, value: formatMetric(metric) };
  }

  const approved =
    metric.status === "CALCULATION_PENDING"
      ? APPROVED_CALCULATION_LABEL[id]
      : undefined;

  return {
    id,
    label,
    pendingState: approved ?? pendingStateForStatus(metric.status),
    reason: metric.reason,
  };
}

function toListItems(
  rows: TechTeamRow[],
  icons?: Record<string, ReactNode>,
): MetricListItem[] {
  return rows.map((row) => ({
    id: row.id,
    icon: icons?.[row.id],
    label: row.label,
    value: row.pendingState ? (
      <PendingStateValue state={row.pendingState} srDescription={row.reason} />
    ) : (
      (row.value ?? "")
    ),
  }));
}

function toLineSeries(chart?: TechTeamChartModel): DashboardLineSeries[] {
  if (!chart) {
    return [];
  }

  return chart.series.flatMap((item) =>
    item.status === "OK"
      ? [
          {
            id: item.id,
            label: SERIES_LABELS[item.id] ?? item.id,
            color: SERIES_COLORS[item.id] ?? "var(--color-chart-series-1)",
            points: item.points.map((point) => ({
              x: formatDay(point.x),
              y: point.y,
            })),
          },
        ]
      : [],
  );
}

/* Renders a request's own loading or failure state in place of its content. */
function RequestState({
  query,
  children,
}: {
  query: { isPending: boolean; isError: boolean; error: Error | null };
  children: ReactNode;
}) {
  if (!query.isPending && !query.isError) {
    return <>{children}</>;
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

/*
  Lists the measures a panel could not plot. A bar chart can only draw a number,
  so a rate that is unavailable would otherwise simply be absent from the
  comparison without saying so.
*/
function UnavailableNotes({ rows }: { rows: TechTeamRow[] }) {
  const unavailable = rows.filter((row) => row.pendingState);

  if (unavailable.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 space-y-1 text-xs" style={{ color: "var(--color-chart-axis)" }}>
      {unavailable.map((row) => (
        <div key={row.id}>
          <span className="font-semibold">{row.label}:</span>{" "}
          <PendingStateValue state={row.pendingState!} />
          {row.reason ? ` — ${row.reason}` : null}
        </div>
      ))}
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

  const { metrics, latency, quality } = useTechTeamMainViewEndpoints(filters);

  /*
    Drawer provenance only. The endpoint contract does not cover it yet, so it
    still comes from the combined main-view route; no value shown on this page
    is read from that payload.
  */
  const { mainViewData: provenance } = useTechTeamMainView(filters);
  const drawers = provenance?.drawers;

  /*
    One drawer at a time. The six keys match the six clickable elements in the
    approved clickability map; the diagnostics list and the latency chart are
    separate entries because they are separate elements inside one panel.
  */
  const [openDrawer, setOpenDrawer] = useState<DrawerKey | null>(null);
  const closeDrawer = () => setOpenDrawer(null);

  const metricById = new Map<TechTeamMetricId, TechTeamMetricModel>(
    (metrics.data?.metrics ?? []).map((metric) => [metric.id, metric]),
  );
  const rowsFor = (ids: TechTeamMetricId[]) =>
    ids.map((id) => toRow(id, metricById.get(id)));

  const diagnosticRows = rowsFor(DIAGNOSTIC_IDS);
  const failureRows = rowsFor(FAILURE_RATE_IDS);
  const capacityRows = rowsFor(CAPACITY_IDS);
  const readinessRows = rowsFor(READINESS_IDS);

  /*
    Only the rates that were measured can be drawn. Each carries its own
    denominator, so the bound comes from the rates themselves rather than being
    assumed, and the ones that could not be measured are named underneath.
  */
  const failureMetrics = FAILURE_RATE_IDS.map((id) => metricById.get(id)).filter(
    (metric): metric is Extract<TechTeamMetricModel, { failureRatePercent: number }> =>
      metric?.status === "OK" && "failureRatePercent" in metric,
  );
  const failureItems = failureMetrics.map((metric) => ({
    label: METRIC_LABELS[metric.id],
    value: metric.failureRatePercent,
  }));
  const failureScaleMax = Math.max(
    FAILURE_RATE_TRACK_MIN,
    ...failureItems.map((item) => item.value),
  );

  const latencySeries = toLineSeries(latency.data);
  const qualitySeries = toLineSeries(quality.data);

  /*
    Retrieval Quality is a 1-5 period value and MLflow Correctness a 0-1 one.
    Both print their scale, because they sit beside a 1-5 chart and neither may
    be read against the other.
  */
  const qualitySupporting = (quality.data?.supportingStats ?? []).flatMap((stat) =>
    stat.status === "OK"
      ? [
          {
            id: stat.id,
            label: SERIES_LABELS[stat.id] ?? stat.id,
            value:
              stat.id === "mlflow-correctness"
                ? `${decimal(stat.value, 2)} / 1`
                : `${decimal(stat.value, 1)} / 5`,
          },
        ]
      : [],
  );

  return (
    <DashboardPage
      title="AI Observability — Technical Teams Dashboard"
      description="Diagnose request paths, failures, evaluator quality, and capacity"
    >
      {/* Shown while any response is still a local fixture rather than measured. */}
      {(metrics.data?.illustrative ?? true) && <IllustrativeValuesBanner />}

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
            <RequestState query={latency}>
              <DashboardLineChart
                series={latencySeries}
                axes={[{ id: "left", label: "Latency (ms)" }]}
                height={260}
              />
            </RequestState>
          </div>

          <div>
            <RequestState query={metrics}>
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
          <RequestState query={metrics}>
            <div>
              <HorizontalBarList
                values={failureItems}
                rowsPerColumn={4}
                max={failureScaleMax}
              />
              <UnavailableNotes rows={failureRows} />
            </div>
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
          <RequestState query={metrics}>
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
          <RequestState query={quality}>
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
          <RequestState query={metrics}>
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
        supporting={qualitySupporting}
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
