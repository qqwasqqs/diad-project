"use client";

import {
  Flag24Regular,
  Key24Regular,
  People24Regular,
  TargetArrow24Regular,
} from "@fluentui/react-icons";

import { PositiveNegativeBar } from "@/components/shared/charts/PositiveNegativeBar";
import DashboardDrawer from "@/components/shared/dashboard/DashboardDrawer";
import DashboardLineChart, {
  type DashboardLineSeries,
} from "@/components/shared/dashboard/DashboardLineChart";
import IllustrativeValuesBanner from "@/components/shared/dashboard/IllustrativeValuesBanner";
import MetricContextTable, {
  type MetricContextRow,
} from "@/components/shared/dashboard/MetricContextTable";
import PanelFootnote from "@/components/shared/dashboard/PanelFootnote";
import PendingStateValue from "@/components/shared/dashboard/PendingStateValue";
import useDrawerFilters from "@/components/shared/dashboard/useDrawerFilters";

interface ProductExperiencePulseSeries {
  id: string;
  label: string;
  color: string;
  yAxis?: string;
  points: Array<{ x: string; y: number }>;
}

export interface ProductExperiencePulseData {
  engagementSeries: ProductExperiencePulseSeries[];
  responsivenessSeries: ProductExperiencePulseSeries[];
  feedback: {
    positive: number;
    negative: number;
  };
  workflowSteps: Array<{
    id: string;
    label: string;
  }>;
  measurementContext: Array<{
    id: string;
    signal: string;
    calculation: string;
    coverage: "pending" | "data";
  }>;
}

interface ProductOwnerProductExperiencePulseDrawerProps {
  open: boolean;
  onClose: () => void;
  data: ProductExperiencePulseData;
}

const workflowIcons = [
  <Key24Regular key="workflow-key" />,
  <Flag24Regular key="terminal-outcome" />,
  <People24Regular key="eligible-denominator" />,
  <TargetArrow24Regular key="scope-attribution" />,
];

const chartAxes = [
  {
    id: "left" as const,
    tickFormatter: (value: number) => `${Math.round(value / 1000)}K`,
    width: 42,
  },
];

const responsivenessAxes = [
  {
    id: "left" as const,
    label: "Latency (s)",
    domain: [0, 2] as [number, number],
    tickFormatter: (value: number) => value.toFixed(1),
    width: 58,
  },
];

function toChartSeries(series: ProductExperiencePulseSeries[]): DashboardLineSeries[] {
  return series.map((item) => ({
    ...item,
    yAxis: item.yAxis === "right" ? "right" : "left",
  }));
}

function PendingLabel({ children }: { children: string }) {
  return (
    <span
      className="text-[10px] font-semibold uppercase tracking-[0.02em]"
      style={{ color: "var(--color-warning-content)" }}
    >
      {children}
    </span>
  );
}

export default function ProductOwnerProductExperiencePulseDrawer({
  open,
  onClose,
  data,
}: ProductOwnerProductExperiencePulseDrawerProps) {
  const headerFilters = useDrawerFilters();
  const contextRows: MetricContextRow[] = data.measurementContext.map((row) => ({
    id: row.id,
    cells: {
      signal: row.signal,
      calculation: row.calculation,
      coverage:
        row.coverage === "data" ? (
          <PendingStateValue state="data" />
        ) : (
          <PendingLabel>PENDING</PendingLabel>
        ),
    },
  }));

  return (
    <DashboardDrawer
      open={open}
      onClose={onClose}
      size="wide"
      eyebrow="PRODUCT EXPERIENCE PULSE DETAILS"
      title="Product experience pulse"
      description="Experience signals over time and measurement readiness"
      headerFilters={headerFilters}
    >
      <div className="space-y-3 pb-1">
        <IllustrativeValuesBanner />

        <section
          aria-labelledby="experience-signals-title"
          className="rounded-lg border border-slate-200 bg-white p-3"
        >
          <h3
            id="experience-signals-title"
            className="text-xs font-semibold text-slate-800"
          >
            Experience signals over time
          </h3>

          <div className="mt-2 grid gap-3 md:grid-cols-2">
            <div className="min-w-0">
              <div className="mb-1 text-center text-[11px] font-semibold text-slate-700">
                Engagement context
              </div>
              <DashboardLineChart
                series={toChartSeries(data.engagementSeries)}
                axes={chartAxes}
                height={130}
                showGrid={false}
              />
            </div>

            <div className="min-w-0 border-slate-200 md:border-l md:pl-3">
              <div className="mb-1 text-center text-[11px] font-semibold text-slate-700">
                Responsiveness context
              </div>
              <DashboardLineChart
                series={toChartSeries(data.responsivenessSeries)}
                axes={responsivenessAxes}
                height={130}
                showGrid={false}
              />
            </div>
          </div>

          <PanelFootnote className="pt-1">
            Engagement and responsiveness are adjacent signals — no causal claim
          </PanelFootnote>
        </section>

        <div className="grid gap-3 md:grid-cols-[0.8fr_1.2fr]">
          <section
            aria-labelledby="feedback-evidence-title"
            className="rounded-lg border border-slate-200 bg-white p-3"
          >
            <h3
              id="feedback-evidence-title"
              className="text-xs font-semibold text-slate-800"
            >
              Feedback evidence
            </h3>

            <div className="mt-3 flex justify-between text-[10px] font-semibold text-slate-700">
              <span>{data.feedback.positive}% positive</span>
              <span>{data.feedback.negative}% negative</span>
            </div>
            <div className="mt-1">
              <PositiveNegativeBar
                positive={data.feedback.positive}
                negative={data.feedback.negative}
              />
            </div>

            <div className="mt-4">
              <PendingLabel>FEEDBACK TREND / COVERAGE PENDING</PendingLabel>
              <p className="mt-1 text-[10px] leading-4 text-slate-600">
                Timestamp and request correlation require approval
              </p>
            </div>
          </section>

          <section
            aria-labelledby="workflow-readiness-title"
            className="rounded-lg border border-slate-200 bg-white p-3"
          >
            <h3
              id="workflow-readiness-title"
              className="text-xs font-semibold text-slate-800"
            >
              Workflow measurement readiness
            </h3>

            <ol className="mt-3 grid grid-cols-2 gap-x-2 gap-y-3 md:grid-cols-4">
              {data.workflowSteps.map((step, index) => (
                <li key={step.id} className="relative flex min-w-0 flex-col items-center text-center">
                  {index < data.workflowSteps.length - 1 && (
                    <span
                      aria-hidden="true"
                      className="absolute top-4 left-[calc(50%+18px)] right-[calc(-50%+18px)] hidden border-t border-dotted border-slate-300 md:block"
                    />
                  )}
                  <span
                    aria-hidden="true"
                    className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600"
                  >
                    {workflowIcons[index]}
                  </span>
                  <span className="mt-1.5 min-h-7 text-[9px] leading-3 text-slate-700">
                    {step.label}
                  </span>
                  <PendingLabel>PENDING</PendingLabel>
                </li>
              ))}
            </ol>

            <div className="mt-3">
              <PendingStateValue state="data" />
              <p className="mt-1 text-[10px] text-slate-600">
                No workflow completion formula supplied
              </p>
            </div>
          </section>
        </div>

        <section
          aria-labelledby="measurement-context-title"
          className="rounded-lg border border-slate-200 bg-white p-3"
        >
          <h3
            id="measurement-context-title"
            className="text-xs font-semibold text-slate-800"
          >
            Measurement context
          </h3>
          <MetricContextTable
            className="mt-1"
            caption="Product experience pulse measurement context"
            columns={[
              { id: "signal", header: "Signal" },
              { id: "calculation", header: "Calculation" },
              { id: "coverage", header: "Coverage" },
            ]}
            rows={contextRows}
          />
        </section>

        <IllustrativeValuesBanner message="WORKFLOW COMPLETION DEFINITION PENDING" />
      </div>
    </DashboardDrawer>
  );
}
