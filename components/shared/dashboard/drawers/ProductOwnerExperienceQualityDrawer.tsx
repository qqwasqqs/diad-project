"use client";

import { Warning16Regular } from "@fluentui/react-icons";

import DashboardDrawer from "@/components/shared/dashboard/DashboardDrawer";
import IllustrativeValuesBanner from "@/components/shared/dashboard/IllustrativeValuesBanner";
import MetricContextTable, {
  type MetricContextRow,
} from "@/components/shared/dashboard/MetricContextTable";
import MetricList, {
  type MetricListItem,
} from "@/components/shared/dashboard/MetricList";
import PanelFootnote from "@/components/shared/dashboard/PanelFootnote";

interface EvaluatorCoverageItem {
  id: string;
  label: string;
  status: "COVERAGE PENDING";
}

interface ScoreDefinitionItem {
  id: string;
  signal: string;
  calculation: string;
  scale: string;
  recordGrain: "PENDING";
}

interface ComparabilityGuardrailItem {
  id: string;
  text: string;
}

interface ExperienceLinkEvidenceItem {
  id: string;
  label: string;
  status: "PENDING";
  note: string;
}

export interface ProductOwnerExperienceQualityData {
  scope: string[];
  evaluatorCoverage: EvaluatorCoverageItem[];
  scoreDefinitionMap: ScoreDefinitionItem[];
  comparabilityGuardrails: ComparabilityGuardrailItem[];
  experienceLinkEvidence: ExperienceLinkEvidenceItem[];
  contextOnly: string;
  bottomNote: string;
}

interface ProductOwnerExperienceQualityDrawerProps {
  open: boolean;
  onClose: () => void;
  data: ProductOwnerExperienceQualityData;
}

function StatusLabel({ children }: { children: string }) {
  return (
    <span
      className="text-[10px] font-semibold uppercase tracking-[0.02em]"
      style={{ color: "var(--color-warning-content)" }}
    >
      {children}
    </span>
  );
}

export default function ProductOwnerExperienceQualityDrawer({
  open,
  onClose,
  data,
}: ProductOwnerExperienceQualityDrawerProps) {
  const coverageItems: MetricListItem[] = data.evaluatorCoverage.map((item) => ({
    id: item.id,
    label: item.label,
    value: <StatusLabel>{item.status}</StatusLabel>,
  }));

  const scoreDefinitionRows: MetricContextRow[] = data.scoreDefinitionMap.map(
    (item) => ({
      id: item.id,
      cells: {
        signal: item.signal,
        calculation: item.calculation,
        scale: item.scale,
        recordGrain: <StatusLabel>{item.recordGrain}</StatusLabel>,
      },
    })
  );

  return (
    <DashboardDrawer
      open={open}
      onClose={onClose}
      size="wide"
      eyebrow="EXPERIENCE QUALITY EVIDENCE DETAILS"
      title="Experience quality evidence"
      description="Coverage, comparability, and experience-link readiness"
    >
      <div className="space-y-3 pb-1">
        <div className="text-xs font-medium text-slate-600">
          {data.scope.join(" · ")}
        </div>

        <IllustrativeValuesBanner className="px-3 py-2" />

        <section
          aria-labelledby="evaluator-coverage-title"
          className="rounded-lg border border-slate-200 bg-white p-3"
        >
          <h3
            id="evaluator-coverage-title"
            className="text-xs font-semibold text-slate-800"
          >
            Evaluator coverage by signal
          </h3>
          <MetricList items={coverageItems} className="mt-2" />
          <p className="mt-1 text-[10px] text-slate-600">
            Coverage threshold and evaluation population not supplied
          </p>
        </section>

        <div className="grid gap-3 md:grid-cols-[1.4fr_1fr]">
          <section
            aria-labelledby="score-definition-map-title"
            className="rounded-lg border border-slate-200 bg-white p-3"
          >
            <h3
              id="score-definition-map-title"
              className="text-xs font-semibold text-slate-800"
            >
              Score-definition map
            </h3>
            <MetricContextTable
              className="mt-2"
              columns={[
                { id: "signal", header: "Signal" },
                { id: "calculation", header: "Calculation" },
                { id: "scale", header: "Scale" },
                { id: "recordGrain", header: "Record grain" },
              ]}
              rows={scoreDefinitionRows}
              caption="Score-definition map"
            />
          </section>

          <section
            aria-labelledby="comparability-guardrails-title"
            className="rounded-lg border border-slate-200 bg-white p-3"
          >
            <h3
              id="comparability-guardrails-title"
              className="text-xs font-semibold text-slate-800"
            >
              Comparability guardrails
            </h3>
            <ul role="list" className="mt-2 space-y-2">
              {data.comparabilityGuardrails.map((item) => (
                <li key={item.id} className="flex items-start gap-2">
                  <span
                    aria-hidden="true"
                    className="mt-0.5 shrink-0"
                    style={{ color: "var(--color-warning-icon)" }}
                  >
                    <Warning16Regular />
                  </span>
                  <span className="text-xs text-slate-700">{item.text}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section
          aria-labelledby="experience-link-evidence-title"
          className="rounded-lg border border-slate-200 bg-white p-3"
        >
          <h3
            id="experience-link-evidence-title"
            className="text-xs font-semibold text-slate-800"
          >
            Experience-link evidence
          </h3>

          <div className="mt-2 space-y-3">
            {data.experienceLinkEvidence.map((item) => (
              <div key={item.id}>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs font-medium text-slate-700">
                    {item.label}
                  </span>
                  <StatusLabel>{item.status}</StatusLabel>
                </div>
                <p className="mt-0.5 text-[10px] text-slate-600">{item.note}</p>
              </div>
            ))}
          </div>

          <PanelFootnote className="mt-3 rounded-md bg-slate-50 px-2 py-2">
            {data.contextOnly}
          </PanelFootnote>
        </section>

        <IllustrativeValuesBanner className="px-3 py-2" message={data.bottomNote} />
      </div>
    </DashboardDrawer>
  );
}
