"use client";

import HorizontalBarList, {
  type HorizontalBarListItem,
} from "@/components/shared/charts/HorizontalBarList";
import DashboardDrawer from "@/components/shared/dashboard/DashboardDrawer";
import IllustrativeValuesBanner from "@/components/shared/dashboard/IllustrativeValuesBanner";
import MetricContextTable, {
  type MetricContextRow,
} from "@/components/shared/dashboard/MetricContextTable";
import MetricList, {
  type MetricListItem,
} from "@/components/shared/dashboard/MetricList";
import PanelFootnote from "@/components/shared/dashboard/PanelFootnote";

interface CoverageItem {
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

export interface ProductOwnerAdoptionAndEngagementData {
  scope: string[];
  sessionDepthDistribution: HorizontalBarListItem[];
  conversationPattern: {
    label: string;
    value: number;
    state: "PROPOSED AGGREGATION";
    note: string;
  };
  sessionDurationDistribution: HorizontalBarListItem[];
  coverageItems: CoverageItem[];
  calculationContext: CalculationContextItem[];
}

interface ProductOwnerAdoptionAndEngagementDrawerProps {
  open: boolean;
  onClose: () => void;
  data: ProductOwnerAdoptionAndEngagementData;
}

const ENGAGEMENT_BAR_COLOR = "#107c41";

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

function DistributionCard({
  title,
  values,
  note,
  titleId,
}: {
  title: string;
  values: HorizontalBarListItem[];
  note: string;
  titleId: string;
}) {
  return (
    <section
      aria-labelledby={titleId}
      className="rounded-lg border border-slate-200 bg-white p-3"
    >
      <h3 id={titleId} className="text-xs font-semibold text-slate-800">
        {title}
      </h3>
      <div className="mt-2">
        <HorizontalBarList
          values={values}
          rowsPerColumn={4}
          barColor={ENGAGEMENT_BAR_COLOR}
        />
      </div>
      <p className="mt-1 text-[10px] text-slate-600">{note}</p>
    </section>
  );
}

export default function ProductOwnerAdoptionAndEngagementDrawer({
  open,
  onClose,
  data,
}: ProductOwnerAdoptionAndEngagementDrawerProps) {
  const coverageItems: MetricListItem[] = data.coverageItems.map((item) => ({
    id: item.id,
    label: item.label,
    value: <StatusLabel>{item.status}</StatusLabel>,
  }));

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
      eyebrow="ENGAGEMENT PATTERNS DETAILS"
      title="Engagement patterns"
      description="Observed behavior within sessions"
    >
      <div className="space-y-3 pb-1">
        <div className="text-xs font-medium text-slate-600">
          {data.scope.join(" · ")}
        </div>

        <IllustrativeValuesBanner className="px-3 py-2" />

        <div className="grid gap-3 md:grid-cols-2">
          <DistributionCard
            titleId="session-depth-distribution-title"
            title="Session depth distribution"
            values={data.sessionDepthDistribution}
            note="Illustrative session grouping"
          />

          <section
            aria-labelledby="conversation-pattern-title"
            className="rounded-lg border border-slate-200 bg-white p-3"
          >
            <h3
              id="conversation-pattern-title"
              className="text-xs font-semibold text-slate-800"
            >
              Conversation pattern
            </h3>

            <div className="mt-2 flex flex-col items-center text-center">
              <div className="text-[10px] font-medium text-slate-600">
                {data.conversationPattern.label}
              </div>
              <div className="relative mt-2 flex h-20 w-20 items-center justify-center rounded-full border-[10px] border-slate-200">
                <span
                  aria-hidden="true"
                  className="absolute -top-2 right-0 h-5 w-2 rounded-full bg-green-700"
                />
                <span className="text-xl font-semibold text-green-800">
                  {data.conversationPattern.value}
                </span>
              </div>
              <div className="mt-2">
                <StatusLabel variant="proposed">
                  {data.conversationPattern.state}
                </StatusLabel>
              </div>
              <p className="mt-1 max-w-56 text-[10px] leading-4 text-slate-600">
                {data.conversationPattern.note}
              </p>
            </div>
          </section>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <DistributionCard
            titleId="session-duration-distribution-title"
            title="Session-duration distribution"
            values={data.sessionDurationDistribution}
            note="Timestamp-derived session spans"
          />

          <section
            aria-labelledby="engagement-coverage-title"
            className="rounded-lg border border-slate-200 bg-white p-3"
          >
            <h3
              id="engagement-coverage-title"
              className="text-xs font-semibold text-slate-800"
            >
              Engagement measurement coverage
            </h3>
            <MetricList items={coverageItems} className="mt-2" />
            <p className="mt-1 text-[10px] text-slate-600">
              Coverage threshold not supplied
            </p>
          </section>
        </div>

        <section
          aria-labelledby="calculation-context-title"
          className="rounded-lg border border-slate-200 bg-white p-3"
        >
          <h3
            id="calculation-context-title"
            className="text-xs font-semibold text-slate-800"
          >
            Calculation context
          </h3>
          <MetricContextTable
            className="mt-1"
            caption="Engagement patterns calculation context"
            columns={[
              { id: "signal", header: "Signal" },
              { id: "calculation", header: "Proposed calculation" },
              { id: "coverage", header: "Coverage" },
            ]}
            rows={calculationRows}
          />
        </section>

        <div className="rounded-lg bg-slate-50 px-3 pb-2">
          <PanelFootnote className="pt-2">
            ENGAGEMENT PATTERNS ARE NOT FEATURE ADOPTION OR WORKFLOW COMPLETION
          </PanelFootnote>
        </div>
      </div>
    </DashboardDrawer>
  );
}
