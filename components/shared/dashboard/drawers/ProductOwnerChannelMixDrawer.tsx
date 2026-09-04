"use client";

import StackedAreaChart, {
  type StackedAreaPoint,
  type StackedAreaSeries,
} from "@/components/shared/charts/StackedAreaChart";
import DashboardDrawer from "@/components/shared/dashboard/DashboardDrawer";
import IllustrativeValuesBanner from "@/components/shared/dashboard/IllustrativeValuesBanner";
import MetricContextTable, {
  type MetricContextRow,
} from "@/components/shared/dashboard/MetricContextTable";
import MetricList, {
  type MetricListItem,
} from "@/components/shared/dashboard/MetricList";
import PanelFootnote from "@/components/shared/dashboard/PanelFootnote";
import useDrawerFilters from "@/components/shared/dashboard/useDrawerFilters";

interface EngagementByChannelItem {
  id: string;
  channel: string;
  queriesPerSession: number;
  avgSessionDuration: string;
}

interface AttributionReadinessItem {
  id: string;
  label: string;
  status: "PENDING";
}

interface CalculationContextItem {
  id: string;
  signal: string;
  proposedCalculation: string;
  coverage: "PENDING";
}

export interface ProductOwnerChannelMixData {
  shareEvolutionSeries: StackedAreaSeries[];
  shareEvolutionPoints: StackedAreaPoint[];
  engagementByChannel: EngagementByChannelItem[];
  attributionReadiness: AttributionReadinessItem[];
  calculationContext: CalculationContextItem[];
}

interface ProductOwnerChannelMixDrawerProps {
  open: boolean;
  onClose: () => void;
  data: ProductOwnerChannelMixData;
}

function StatusLabel({
  children,
  variant = "pending",
}: {
  children: string;
  variant?: "pending" | "proposed";
}) {
  return (
    <span
      className="text-[10px] font-semibold uppercase tracking-[0.02em]"
      style={{
        color:
          variant === "proposed"
            ? "var(--color-success-content)"
            : "var(--color-warning-content)",
      }}
    >
      {children}
    </span>
  );
}

export default function ProductOwnerChannelMixDrawer({
  open,
  onClose,
  data,
}: ProductOwnerChannelMixDrawerProps) {
  const headerFilters = useDrawerFilters();
  const engagementColumns = [
    { id: "channel", header: "Channel" },
    { id: "queriesPerSession", header: "Queries / session" },
    { id: "avgSessionDuration", header: "Avg session duration" },
  ];

  const engagementRows: MetricContextRow[] = data.engagementByChannel.map(
    (item) => ({
      id: item.id,
      cells: {
        channel: item.channel,
        queriesPerSession: item.queriesPerSession,
        avgSessionDuration: item.avgSessionDuration,
      },
    })
  );

  const attributionItems: MetricListItem[] = data.attributionReadiness.map(
    (item) => ({
      id: item.id,
      label: item.label,
      value: <StatusLabel>{item.status}</StatusLabel>,
    })
  );

  const calculationRows: MetricContextRow[] = data.calculationContext.map(
    (item) => ({
      id: item.id,
      cells: {
        signal: item.signal,
        calculation: item.proposedCalculation,
        coverage: <StatusLabel>{item.coverage}</StatusLabel>,
      },
    })
  );

  return (
    <DashboardDrawer
      open={open}
      onClose={onClose}
      size="wide"
      eyebrow="CHANNEL ENGAGEMENT PATTERNS DETAILS"
      title="Channel engagement patterns"
      description="Entry-channel change and observed session context"
      headerFilters={headerFilters}
    >
      <div className="space-y-3 pb-1">
        <IllustrativeValuesBanner className="px-3 py-2" />

        <section
          aria-labelledby="channel-share-evolution-title"
          className="rounded-lg border border-slate-200 bg-white p-3"
        >
          <h3
            id="channel-share-evolution-title"
            className="text-xs font-semibold text-slate-800"
          >
            Channel share evolution
          </h3>
          <p className="text-[10px] text-slate-600">
            Illustrative daily classified-query share
          </p>

          <div className="mt-2">
            <StackedAreaChart
              series={data.shareEvolutionSeries}
              points={data.shareEvolutionPoints}
              axisLabel="Share of classified queries"
              height={200}
            />
          </div>
        </section>

        <div className="grid gap-3 md:grid-cols-2">
          <section
            aria-labelledby="engagement-by-channel-title"
            className="rounded-lg border border-slate-200 bg-white p-3"
          >
            <h3
              id="engagement-by-channel-title"
              className="text-xs font-semibold text-slate-800"
            >
              Engagement by entry channel
            </h3>
            <MetricContextTable
              className="mt-2"
              columns={engagementColumns}
              rows={engagementRows}
              caption="Engagement by entry channel"
            />
            <div className="mt-2 text-center">
              <StatusLabel>PROPOSED AGGREGATION</StatusLabel>
            </div>
          </section>

          <section
            aria-labelledby="channel-attribution-readiness-title"
            className="rounded-lg border border-slate-200 bg-white p-3"
          >
            <h3
              id="channel-attribution-readiness-title"
              className="text-xs font-semibold text-slate-800"
            >
              Channel attribution readiness
            </h3>
            <MetricList items={attributionItems} className="mt-2" />
            <p className="mt-1 text-[10px] text-slate-600">
              Multi-channel session rule not supplied
            </p>
          </section>
        </div>

        <section
          aria-labelledby="channel-calculation-context-title"
          className="rounded-lg border border-slate-200 bg-white p-3"
        >
          <h3
            id="channel-calculation-context-title"
            className="text-xs font-semibold text-slate-800"
          >
            Calculation context
          </h3>
          <MetricContextTable
            className="mt-2"
            columns={[
              { id: "signal", header: "Signal" },
              { id: "calculation", header: "Proposed calculation" },
              { id: "coverage", header: "Coverage" },
            ]}
            rows={calculationRows}
            caption="Channel mix calculation context"
          />
        </section>

        <PanelFootnote className="pt-0">
          Channel patterns do not establish feature adoption, satisfaction, or
          causation
        </PanelFootnote>
      </div>
    </DashboardDrawer>
  );
}
