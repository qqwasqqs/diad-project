/*
  Regenerates public/mocks/new-pages/operations-team-dashboard.json.

  Run: node scripts/mocks/generate-operations-mock.mjs

  The mock is a source, not a response: it holds numeric amounts and the full
  90-day range, and the main-view route slices it to the selected period, applies
  the selected scope, and formats the display strings.

  Output is deterministic — no randomness and no current date — so regenerating
  produces an identical file unless this script changes.
*/

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../public/mocks/new-pages/operations-team-dashboard.json",
);

const DAYS = 90;
const START = new Date(Date.UTC(2026, 1, 19));

const dates = Array.from({ length: DAYS }, (_, i) => {
  const d = new Date(START);
  d.setUTCDate(START.getUTCDate() + i);
  return d.toISOString().slice(0, 10);
});

/*
  Wobble around a base value, plus the modest late rise the approved chart shows,
  anchored to the final days so the shape holds at 7, 30, or 90 days.
*/
const RISE_DAYS = 8;
const shape = (i, base, amp) => {
  const wobble = Math.sin(i / 1.7) * amp + Math.sin(i / 4.3) * amp * 0.6;
  const intoRise = i - (DAYS - RISE_DAYS);
  const rise = intoRise > 0 ? Math.pow(intoRise, 1.6) * (base / 320) : 0;
  return base + wobble + rise;
};

const series = (id, label, base, amp) => ({
  id,
  label,
  points: dates.map((x, i) => ({ x, y: Math.round(shape(i, base, amp)) })),
});

const payload = {
  generatedAt: "2026-09-01T00:00:00.000Z",
  note: "Illustrative values. Not production telemetry. Targets and thresholds pending validation.",

  operationalSituation: [
    { id: "end-to-end-latency", label: "End-to-End Latency", amount: 1.2, prefix: "P95 ", unit: " s", decimals: 2 },
    { id: "api-error-rate", label: "API Error Rate", amount: 1.14, unit: "%", decimals: 2 },
    { id: "pipeline-failure-rate", label: "Pipeline Failure Rate", amount: 0.7, unit: "%", decimals: 1 },
    // No approved threshold, severity, ownership, or acknowledgement contract.
    { id: "alert-feed", label: "Alert feed", pendingState: "threshold" },
  ],

  /*
    Operations requirements with no reporting contract. Never zero values, and
    never inferred: an uptime percentage must not be derived from response
    status, and CPU, memory, and load have no source at all.
  */
  requestedOperationsCoverage: [
    { id: "uptime-sla", label: "Uptime / SLA", pendingState: "definition" },
    { id: "cpu-memory", label: "CPU / Memory", pendingState: "data" },
    { id: "system-load", label: "System load", pendingState: "data" },
  ],

  servicePathStability: {
    latencySeries: [
      series("end-to-end-p95", "End-to-End P95", 1200, 90),
      series("model-response-avg", "Model Response avg", 760, 60),
      series("retrieval-avg", "Retrieval avg", 210, 22),
      series("tool-call-avg", "Tool Call avg", 180, 16),
    ],
    diagnostics: [
      { id: "request-throughput", label: "Request Throughput", amount: 42.8, unit: " req/s", decimals: 1 },
      { id: "pipeline-duration", label: "Pipeline Duration avg", amount: 42, unit: " s", decimals: 0 },
      { id: "indexing-ai-services", label: "Indexing / AI Services avg", amount: 620, unit: " ms", decimals: 0 },
      // token/second, queries/second, and trace-token alternatives are non-equivalent.
      { id: "token-throughput", label: "Token Throughput", pendingState: "definition" },
    ],
  },

  failureSurface: {
    scaleMax: 2,
    // Nine workloads, each with its own denominator. Compared, never summed.
    items: [
      { label: "Pipeline", value: 0.7 },
      { label: "Activity", value: 0.6 },
      { label: "Job", value: 0.9 },
      { label: "API", value: 1.14 },
      { label: "Training", value: 0.5 },
      { label: "MLflow Span", value: 0.8 },
      { label: "Indexing", value: 0.6 },
      { label: "Transcription", value: 0.4 },
      { label: "Translation", value: 0.3 },
    ],
  },

  // No numeric aggregation is authorized for this section.
  operationalControlCoverage: [
    { id: "training-reproducibility", label: "Training Reproducibility", pendingState: "definition" },
    { id: "audit-logging", label: "Audit Logging", pendingState: "calculation" },
    { id: "tool-usage-compliance", label: "Tool Usage Compliance", pendingState: "calculation" },
    { id: "model-governance", label: "Model Governance", pendingState: "calculation" },
    { id: "environment-compliance", label: "Environment Compliance", pendingState: "calculation" },
  ],

  safetyAndSecurityReadiness: [
    { id: "safety-evaluation-score", label: "Safety Evaluation Score", pendingState: "calculation" },
    { id: "mlflow-safety-score", label: "MLflow Safety Score", amount: 0.91, unit: " / 1", decimals: 2, max: 1 },
    { id: "pii-leakage", label: "PII Leakage (Agent Only)", pendingState: "data" },
    { id: "upia", label: "UPIA", pendingState: "test-results" },
  ],
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`);
console.log(`wrote ${OUT}`);
