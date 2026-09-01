"use client";

import { useState } from "react";
import {
  ArrowSync24Regular,
  DataTrending24Regular,
  LockClosed24Regular,
  Money24Regular,
  Scales24Regular,
  ShieldCheckmark24Regular,
  ThumbLike24Regular,
  Warning24Regular,
} from "@fluentui/react-icons";

import DashboardPage from "@/components/shared/dashboard/DashboardPage";
import DashboardGrid from "@/components/shared/dashboard/DashboardGrid";
import DashboardPanel from "@/components/shared/dashboard/DashboardPanel";
import DashboardLineChart from "@/components/shared/dashboard/DashboardLineChart";
import IllustrativeValuesBanner from "@/components/shared/dashboard/IllustrativeValuesBanner";
import PendingStateValue from "@/components/shared/dashboard/PendingStateValue";
import StatusCallout from "@/components/shared/dashboard/StatusCallout";
import { MetricCard } from "@/components/shared/dashboard/MetricCard";
import { PositiveNegativeBar } from "@/components/shared/charts/PositiveNegativeBar";
import CostByBusinessUnitChart from "@/components/charts/CostByBusinessUnitChart";
import { useExecutiveMainView } from "@/hooks/useExecutiveDashboard";
import DashboardSectionAction from "@/components/shared/dashboard/DashboardSectionAction";
import DetailDrawer from "@/components/shared/dashboard/DetailDrawer";
import MetricList from "@/components/shared/dashboard/MetricList";
import HorizontalBarList from "@/components/shared/charts/HorizontalBarList";
import MetricContextTable from "@/components/shared/dashboard/MetricContextTable";
import { useDashboardFiltersStore } from "@/store/dashboardFiltersStore";
import type { MetricRow, Series } from "@/types/dashboard";
import type { ExecutivePulseCard } from "@/types/executiveDashboard";

/*
  Executive main view.

  Presentation only. The payload comes from the main-view endpoint through
  useExecutiveMainView, so this file is unaffected by where the data originates.
  The dashboard displays already aggregated results; it performs no metric
  calculation of its own. Metrics without an approved definition render an
  explicit pending state and are never shown as zero.
*/

// A metric keeps the same series color everywhere it appears.
const SERIES_COLORS = [
  "var(--color-chart-series-1)",
  "var(--color-chart-series-2)",
];

const PULSE_ICONS: Record<string, React.ReactNode> = {
  "end-to-end-latency": (
    <ArrowSync24Regular style={{ color: "var(--color-success-icon)" }} />
  ),
  "api-error-rate": (
    <Warning24Regular style={{ color: "var(--color-warning-content)" }} />
  ),
  "session-query-volume": (
    <DataTrending24Regular style={{ color: "var(--color-chart-series-1)" }} />
  ),
  "user-feedback": (
    <ThumbLike24Regular style={{ color: "var(--color-success-icon)" }} />
  ),
  "cost-per-request": (
    <Money24Regular style={{ color: "var(--color-chart-series-4)" }} />
  ),
};

const SAFETY_ICONS: Record<string, React.ReactNode> = {
  "safety-evaluation-score": <ShieldCheckmark24Regular />,
  "mlflow-safety-score": <Scales24Regular />,
  "pii-leakage": <LockClosed24Regular />,
};

// Formats a day key as the short axis label used in the approved design.
const formatDay = (value: string) =>
  new Date(`${value}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

const formatThousands = (value: number) => `${Math.round(value / 1000)}K`;

/*
  The four clickable sections. Each opens one drawer for the whole section;
  individual pulse cards and individual cost bars are not separate targets.
*/
type DrawerKey =
  | "pulse"
  | "sessionAndQueryVolume"
  | "costByBusinessUnit"
  | "safetyAndRisk";

// Rows of label and value, used for the smaller blocks inside a drawer.
const toRows = (rows: MetricRow[]) =>
  rows.map((row) => ({
    id: row.id,
    label: row.label,
    value: row.pendingState ? (
      <PendingStateValue state={row.pendingState} />
    ) : (
      row.value ?? ""
    ),
  }));

function DrawerSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h4
        className="mb-2 text-sm font-semibold"
        style={{ color: "var(--color-text-primary)" }}
      >
        {title}
      </h4>
      {children}
    </section>
  );
}

/*
  A card's primary content: the value with its unit, or the approved pending
  state. The suffix is typeset smaller so the number stays the focus.
*/
function CardValue({
  card,
  suffixClassName = "text-2xl",
}: {
  card: ExecutivePulseCard;
  suffixClassName?: string;
}) {
  if (card.pendingState) {
    return <PendingStateValue state={card.pendingState} />;
  }

  return (
    <span>
      {card.value}
      {card.suffix && (
        // normal-case: the safety row renders inside an uppercased container,
        // and a unit is not a status label.
        <span className={`ml-2 font-normal normal-case ${suffixClassName}`}>
          {card.suffix}
        </span>
      )}
    </span>
  );
}

export default function ExecutiveDashboard() {
  /*
    The page opts in to the global filter bar: the selected scope is passed to
    the hook, which keys its cache on it, so changing a filter refetches the
    payload for that scope.
  */
  const period = useDashboardFiltersStore((state) => state.period);
  const businessUnit = useDashboardFiltersStore((state) => state.businessUnit);
  const project = useDashboardFiltersStore((state) => state.project);
  const channel = useDashboardFiltersStore((state) => state.channel);

  const [openDrawer, setOpenDrawer] = useState<DrawerKey | null>(null);
  const closeDrawer = () => setOpenDrawer(null);

  const { mainViewData: data } = useExecutiveMainView({
    period,
    businessUnit,
    project,
    channel,
  });

  const drawers = data?.drawers;

  /*
    Sessions and queries are different populations at different magnitudes, so
    they keep separate axes and are never plotted on one scale.
  */
  const volumeSeries =
    data?.sessionAndQueryVolume.series.map((series: Series, index: number) => ({
      id: series.id,
      label: series.label,
      color: SERIES_COLORS[index],
      yAxis: index === 0 ? ("left" as const) : ("right" as const),
      points: series.points.map((point) => ({
        x: formatDay(point.x),
        y: point.y,
      })),
    })) ?? [];

  return (
    <DashboardPage
      title="AI Observability — Executive Dashboard"
      description="Strategic view of performance, adoption, cost, and safety"
    >
      <IllustrativeValuesBanner />

      <DashboardGrid columns={12}>
        {/* Executive pulse: five approved summary states. */}
        <DashboardPanel
          template="single"
          title="Executive pulse"
          className="xl:col-span-12"
          actions={
            <DashboardSectionAction
              onClick={() => setOpenDrawer("pulse")}
              label="View executive pulse details"
            />
          }
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {(data?.pulse ?? []).map((card) => (
              <MetricCard
                key={card.id}
                icon={PULSE_ICONS[card.id]}
                title={card.label}
                primaryContent={<CardValue card={card} />}
                supportingContent={
                  card.split ? (
                    <PositiveNegativeBar
                      positive={card.split.positive}
                      negative={card.split.negative}
                    />
                  ) : card.supporting ? (
                    <span
                      className="text-xs"
                      style={{ color: "var(--color-chart-axis)" }}
                    >
                      {card.supporting}
                    </span>
                  ) : undefined
                }
                className="rounded-lg border border-chart-grid"
                valueClassName="text-3xl font-semibold"
                headerMinHeight="min-h-[60px]"
                pinSupporting
              />
            ))}
          </div>
        </DashboardPanel>

        {/* Activity and engagement only: not satisfaction, completion, or value. */}
        <DashboardPanel
          template="single"
          title="Session & Query Volume (Session Length / Query per Session)"
          className="xl:col-span-7"
          actions={
            <DashboardSectionAction
              onClick={() => setOpenDrawer("sessionAndQueryVolume")}
              label="View engagement details"
            />
          }
        >
          <DashboardLineChart
            series={volumeSeries}
            axes={[
              { id: "left", label: "Sessions", tickFormatter: formatThousands },
              { id: "right", label: "Queries", tickFormatter: formatThousands },
            ]}
            height={280}
            supportingStats={(data?.sessionAndQueryVolume.supporting ?? []).map(
              (stat) => ({
                id: stat.id,
                value: stat.value,
                text: stat.label,
              }),
            )}
          />
        </DashboardPanel>

        {/* Each project bar is a subset of its business-unit total, never an
            addition. Infrastructure cost stays separate and pending. */}
        <DashboardPanel
          template="single"
          title="Cost by BU and Project"
          className="xl:col-span-5"
          actions={
            <DashboardSectionAction
              onClick={() => setOpenDrawer("costByBusinessUnit")}
              label="View cost allocation details"
            />
          }
        >
          <CostByBusinessUnitChart data={data?.costByBusinessUnit.items ?? []} />
        </DashboardPanel>

        <DashboardPanel
          template="single"
          title="Safety &amp; risk posture"
          className="xl:col-span-12"
          actions={
            <DashboardSectionAction
              onClick={() => setOpenDrawer("safetyAndRisk")}
              label="View safety and risk details"
            />
          }
        >
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            {(data?.safetyAndRisk ?? []).map((card) => (
              <StatusCallout
                key={card.id}
                icon={SAFETY_ICONS[card.id]}
                title={card.label}
                variant={card.pendingState ? "warning" : "danger"}
                primaryContent={
                  <CardValue card={card} suffixClassName="text-base" />
                }
              />
            ))}
          </div>
        </DashboardPanel>
      </DashboardGrid>

      {/* Detail drawers. One per section; a drawer never merges two sections. */}

      <DetailDrawer
        open={openDrawer === "pulse"}
        onClose={closeDrawer}
        content={drawers?.pulse}
        size="wide"
      >
        <DrawerSection title="End-to-End Latency">
          <MetricList items={toRows(drawers?.pulse.latency ?? [])} />
        </DrawerSection>

        <DrawerSection title="API response-status distribution">
          <HorizontalBarList
            values={(drawers?.pulse.apiStatus ?? []).map((row) => ({
              label: row.label,
              value: row.sharePct,
            }))}
            rowsPerColumn={3}
          />
        </DrawerSection>

        <DrawerSection title="User Feedback">
          <MetricList items={toRows(drawers?.pulse.feedback ?? [])} />
        </DrawerSection>

        {/*
          Handoffs, not links: these two signals are owned by their own
          sections, and no navigation target is approved yet.
        */}
        <DrawerSection title="Detail lives in these sections">
          <MetricList
            items={(drawers?.pulse.handoffs ?? []).map((handoff) => ({
              id: handoff.id,
              label: handoff.label,
              value: handoff.destination,
            }))}
          />
        </DrawerSection>
      </DetailDrawer>

      <DetailDrawer
        open={openDrawer === "sessionAndQueryVolume"}
        onClose={closeDrawer}
        content={drawers?.sessionAndQueryVolume}
        size="wide"
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(drawers?.sessionAndQueryVolume.summary ?? []).map((row) => (
            <MetricCard
              key={row.id}
              title={row.label}
              primaryContent={row.value}
              className="rounded-lg border border-chart-grid"
              minHeight="min-h-0"
              titleClassName="text-xs font-medium"
              valueClassName="text-xl font-semibold"
            />
          ))}
        </div>

        <DrawerSection title="Engagement by channel">
          <MetricContextTable
            columns={[
              { id: "channel", header: "Channel" },
              { id: "queries", header: "Queries" },
              { id: "sessions", header: "Sessions" },
              { id: "share", header: "Share of queries" },
            ]}
            rows={(drawers?.sessionAndQueryVolume.channels ?? []).map((row) => ({
              id: row.id,
              cells: {
                channel: row.label,
                queries: row.queries,
                sessions: row.sessions,
                share: `${row.sharePct}%`,
              },
            }))}
            caption="Engagement by entry channel"
          />
        </DrawerSection>

        <DrawerSection title="Session depth distribution">
          <HorizontalBarList
            values={(drawers?.sessionAndQueryVolume.sessionDepth ?? []).map(
              (row) => ({ label: row.label, value: row.sharePct }),
            )}
            rowsPerColumn={4}
          />
        </DrawerSection>

        <DrawerSection title="Conversation context">
          <MetricList
            items={toRows(drawers?.sessionAndQueryVolume.conversationContext ?? [])}
          />
        </DrawerSection>
      </DetailDrawer>

      <DetailDrawer
        open={openDrawer === "costByBusinessUnit"}
        onClose={closeDrawer}
        content={drawers?.costByBusinessUnit}
        size="wide"
      >
        <div className="grid grid-cols-2 gap-3">
          {(drawers?.costByBusinessUnit.portfolio ?? []).map((row) => (
            <MetricCard
              key={row.id}
              title={row.label}
              primaryContent={row.value}
              className="rounded-lg border border-chart-grid"
              minHeight="min-h-0"
              titleClassName="text-xs font-medium"
              valueClassName="text-xl font-semibold"
            />
          ))}
        </div>

        {/* Descending allocation. Each project stays a subset of its parent. */}
        <DrawerSection title="Allocation by business unit">
          <MetricContextTable
            columns={[
              { id: "unit", header: "Business unit" },
              { id: "cost", header: "Token cost" },
              { id: "project", header: "Displayed project" },
              { id: "projectCost", header: "Project subset" },
            ]}
            rows={[...(drawers?.costByBusinessUnit.allocation ?? data?.costByBusinessUnit.items ?? [])]
              .sort((a, b) => b.totalCost - a.totalCost)
              .map((item) => ({
                id: item.name,
                cells: {
                  unit: item.name,
                  cost: `$${item.totalCost.toFixed(2)}K`,
                  project: item.topProjectName,
                  projectCost: `$${item.topProjectCost.toFixed(2)}K`,
                },
              }))}
            caption="Attributed token cost by business unit"
          />
        </DrawerSection>

        <DrawerSection title="Separate signal">
          <MetricList
            items={toRows([drawers?.costByBusinessUnit.infrastructureCost].filter(
              (row): row is MetricRow => Boolean(row),
            ))}
          />
        </DrawerSection>
      </DetailDrawer>

      <DetailDrawer
        open={openDrawer === "safetyAndRisk"}
        onClose={closeDrawer}
        content={drawers?.safetyAndRisk}
        size="wide"
      >
        <DrawerSection title="What each signal reports">
          <MetricList items={toRows(drawers?.safetyAndRisk.signals ?? [])} />
        </DrawerSection>
      </DetailDrawer>
    </DashboardPage>
  );
}
