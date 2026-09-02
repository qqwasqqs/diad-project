"use client";

import {
  ArrowRight16Regular,
  ClipboardTask24Regular,
  People24Regular,
  ShieldCheckmark24Regular,
  TargetArrow24Regular,
  Scales32Regular,
} from "@fluentui/react-icons";

import DashboardDrawer from "@/components/shared/dashboard/DashboardDrawer";
import IllustrativeValuesBanner from "@/components/shared/dashboard/IllustrativeValuesBanner";
import MetricContextTable, {
  type MetricContextRow,
} from "@/components/shared/dashboard/MetricContextTable";
import PanelFootnote from "@/components/shared/dashboard/PanelFootnote";
import StatusCallout from "@/components/shared/dashboard/StatusCallout";

interface SignalInterpretationItem {
  id: string;
  signal: string;
  canInform: string;
  cannotEstablish: string;
}

type DecisionPathIcon = "definition" | "coverage" | "outcome" | "decision";

interface DecisionPathItem {
  id: string;
  label: string;
  icon: DecisionPathIcon;
  status: "PENDING";
}

export interface ProductOwnerTrustEvidenceData {
  scope: string[];
  decisionReadiness: {
    label: "DECISION READINESS PENDING";
    description: string;
  };
  signalInterpretation: SignalInterpretationItem[];
  decisionPath: DecisionPathItem[];
  decisionBoundary: string;
  footer: string;
}

interface ProductOwnerTrustEvidenceDrawerProps {
  open: boolean;
  onClose: () => void;
  data: ProductOwnerTrustEvidenceData;
}

const decisionPathIcons: Record<DecisionPathIcon, React.ReactNode> = {
  definition: <ClipboardTask24Regular />,
  coverage: <People24Regular />,
  outcome: <TargetArrow24Regular />,
  decision: <ShieldCheckmark24Regular />,
};

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

export default function ProductOwnerTrustEvidenceDrawer({
  open,
  onClose,
  data,
}: ProductOwnerTrustEvidenceDrawerProps) {
  const interpretationRows: MetricContextRow[] = data.signalInterpretation.map(
    (item) => ({
      id: item.id,
      cells: {
        signal: item.signal,
        canInform: item.canInform,
        cannotEstablish: item.cannotEstablish,
      },
    })
  );

  return (
    <DashboardDrawer
      open={open}
      onClose={onClose}
      size="wide"
      eyebrow="TRUST EVIDENCE DECISION DETAILS"
      title="Trust evidence decision guide"
      description="When trust signals can responsibly inform product decisions"
    >
      <div className="space-y-3 pb-1">
        <div className="text-xs font-medium text-slate-600">
          {data.scope.join(" · ")}
        </div>

        <IllustrativeValuesBanner className="px-3 py-2" />

        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <StatusCallout
            icon={<Scales32Regular />}
            title={data.decisionReadiness.description}
            primaryContent={data.decisionReadiness.label}
            variant="neutral"
            titleClassName="text-slate-600"
          />
        </section>

        <section
          aria-labelledby="signal-interpretation-guide-title"
          className="rounded-lg border border-slate-200 bg-white p-3"
        >
          <h3
            id="signal-interpretation-guide-title"
            className="text-xs font-semibold text-slate-800"
          >
            Signal interpretation guide
          </h3>
          <MetricContextTable
            className="mt-2"
            columns={[
              { id: "signal", header: "Signal" },
              { id: "canInform", header: "Can inform" },
              { id: "cannotEstablish", header: "Cannot establish" },
            ]}
            rows={interpretationRows}
            caption="Trust signal interpretation guide"
          />
        </section>

        <section
          aria-labelledby="product-decision-readiness-path-title"
          className="rounded-lg border border-slate-200 bg-white p-3"
        >
          <h3
            id="product-decision-readiness-path-title"
            className="text-xs font-semibold text-slate-800"
          >
            Product-decision readiness path
          </h3>

          <ol className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
            {data.decisionPath.map((item, index) => (
              <li key={item.id} className="relative min-w-0">
                {index < data.decisionPath.length - 1 && (
                  <span
                    aria-hidden="true"
                    className="absolute left-[calc(100%+3px)] top-9 z-10 hidden text-slate-500 md:block"
                  >
                    <ArrowRight16Regular />
                  </span>
                )}
                <div className="flex min-h-[92px] flex-col items-center justify-center rounded-lg border border-slate-200 px-2 py-2 text-center">
                  <span
                    aria-hidden="true"
                    className="flex h-7 w-7 items-center justify-center text-slate-700"
                  >
                    {decisionPathIcons[item.icon]}
                  </span>
                  <span className="mt-1 min-h-8 text-[10px] font-medium leading-3 text-slate-700">
                    {item.label}
                  </span>
                  <PendingLabel>{item.status}</PendingLabel>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <IllustrativeValuesBanner
          className="px-3 py-2"
          message={data.decisionBoundary}
        />

        <PanelFootnote className="pt-0">{data.footer}</PanelFootnote>
      </div>
    </DashboardDrawer>
  );
}
