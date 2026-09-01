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


/*
  Detail drawers. Text follows the approved drawer specifications; every
  unresolved item stays an approved pending state rather than a placeholder.
*/
const pct = (id, label, base, amp) => ({
  id,
  label,
  points: dates.map((x, i) => ({
    x,
    y: Number(Math.max(0, base + Math.sin(i / 2.1) * amp).toFixed(2)),
  })),
});

payload.drawers = {
  operationalSituation: {
    eyebrow: "OPERATIONAL SITUATION DETAILS",
    title: "Operational situation",
    description: "Direction and calculation provenance \u2014 not a health score",
    bannerMessage:
      "ILLUSTRATIVE VALUES \u2014 TIME BUCKET AND ATTRIBUTION PENDING VALIDATION",
    summary: [
      { id: "end-to-end-p95", label: "End-to-End P95", value: "1.20 s" },
      { id: "api-error-rate", label: "API Error Rate", value: "1.14%" },
      { id: "pipeline-failure-rate", label: "Pipeline Failure Rate", value: "0.7%" },
      { id: "alert-feed", label: "Alert feed", pendingState: "threshold" },
    ],
    // Latency on one axis, the two rates on another: different units.
    series: [
      series("end-to-end-p95", "End-to-End P95 (ms)", 1200, 90),
      pct("api-error-rate", "API Error Rate (%)", 1.14, 0.18),
      pct("pipeline-failure-rate", "Pipeline Failure Rate (%)", 0.7, 0.12),
    ],
    contextRows: [
      { id: "e2e", metric: "End-to-End P95", calculation: "P95(eligible response_latency_ms)", coverage: "filter-breakdown" },
      { id: "api", metric: "API Error Rate", calculation: "errored requests / eligible requests", coverage: "filter-breakdown" },
      { id: "pipeline", metric: "Pipeline Failure Rate", calculation: "failed runs / eligible pipeline runs", coverage: "filter-breakdown" },
    ],
    notes: [
      "No alert rule or threshold contract is available, so the alert feed reports its state rather than a count",
      "Direction and provenance only \u2014 not a composite health score or an incident conclusion",
    ],
  },

  requestedOperationsCoverage: {
    eyebrow: "MONITORING READINESS",
    title: "Requested operations coverage",
    description: "What each requirement still needs before it can be reported",
    bannerMessage:
      "ILLUSTRATIVE VALUES \u2014 NO INFRASTRUCTURE MEASUREMENT CONTRACT SUPPLIED",
    matrix: [
      { id: "uptime-sla", label: "Uptime / SLA", pendingState: "definition", missingContract: "Formula, target, and service boundary" },
      { id: "cpu-memory", label: "CPU / Memory", pendingState: "data", missingContract: "Telemetry fields" },
      { id: "system-load", label: "System load", pendingState: "data", missingContract: "Telemetry fields" },
      { id: "alert-feed", label: "Alert feed", pendingState: "threshold", missingContract: "Alert rule, severity, ownership, acknowledgement" },
    ],
    contextRows: [],
    notes: [
      "Pending does not mean zero, healthy, or an unavailable service",
      "An uptime percentage is never inferred from response status",
    ],
  },

  servicePathStabilityChart: {
    eyebrow: "SERVICE-PATH STABILITY DETAILS",
    title: "Service-path stability",
    description: "End-to-End P95 \u00b7 Model Response avg \u00b7 Retrieval avg \u00b7 Tool Call avg",
    bannerMessage:
      "ILLUSTRATIVE VALUES \u2014 TIME BUCKET, TIMEZONE, AND ATTRIBUTION PENDING VALIDATION",
    summary: [
      { id: "end-to-end-p95", label: "End-to-End P95", value: "1.20 s" },
      { id: "model-response-avg", label: "Model Response avg", value: "760 ms" },
      { id: "retrieval-avg", label: "Retrieval avg", value: "210 ms" },
      { id: "tool-call-avg", label: "Tool Call avg", value: "180 ms" },
    ],
    contextRows: [
      { id: "end-to-end-p95", metric: "End-to-End P95", calculation: "P95", latest: "1.20 s", coverage: "filter-breakdown" },
      { id: "model-response-avg", metric: "Model Response avg", calculation: "avg", latest: "760 ms", coverage: "filter-breakdown" },
      { id: "retrieval-avg", metric: "Retrieval avg", calculation: "avg", latest: "210 ms", coverage: "filter-breakdown" },
      { id: "tool-call-avg", metric: "Tool Call avg", calculation: "avg", latest: "180 ms", coverage: "filter-breakdown" },
    ],
    notes: [
      "Component times are not additive",
      "P95 is calculated from eligible individual requests, never from averages",
    ],
  },

  servicePathRuntimeContext: {
    eyebrow: "SERVICE-PATH RUNTIME CONTEXT",
    title: "Runtime context",
    description: "Four independently calculated operational measures",
    bannerMessage:
      "ILLUSTRATIVE VALUES \u2014 POPULATIONS AND ATTRIBUTION PENDING VALIDATION",
    summary: [
      { id: "request-throughput", label: "Request Throughput", value: "42.8 req/s" },
      { id: "pipeline-duration", label: "Pipeline Duration avg", value: "42 s" },
      { id: "indexing-ai-services", label: "Indexing / AI Services avg", value: "620 ms" },
      { id: "token-throughput", label: "Token Throughput", pendingState: "definition" },
    ],
    contextRows: [
      { id: "request-throughput", metric: "Request Throughput", calculation: "COUNT(DISTINCT request_id) / bucket seconds", scale: "req/s", coverage: "filter-breakdown" },
      { id: "pipeline-duration", metric: "Pipeline Duration avg", calculation: "AVG(final pipeline run duration)", scale: "seconds", coverage: "filter-breakdown" },
      { id: "indexing-ai-services", metric: "Indexing / AI Services avg", calculation: "AVG(service operation latency)", scale: "milliseconds", coverage: "filter-breakdown" },
    ],
    notes: [
      "Units and populations stay separate; these are not a combined health score",
      "Pipeline and indexing timing is asynchronous and is not added to request-path latency",
    ],
  },

  failureSurface: {
    eyebrow: "FAILURE SURFACE DETAILS",
    title: "Failure surface",
    description: "Nine workload rates, each with its own eligible unit",
    bannerMessage:
      "ILLUSTRATIVE RATES \u2014 FAILURE CLASSIFICATION PENDING VALIDATION",
    contextRows: [
      { id: "pipeline", metric: "Pipeline", calculation: "failed runs / eligible pipeline runs", coverage: "filter-breakdown" },
      { id: "activity", metric: "Activity", calculation: "failed activities / eligible activities", coverage: "filter-breakdown" },
      { id: "job", metric: "Job", calculation: "failed job runs / eligible job runs", coverage: "filter-breakdown" },
      { id: "api", metric: "API", calculation: "errored requests / eligible requests", coverage: "filter-breakdown" },
      { id: "training", metric: "Training", calculation: "failed training runs / eligible runs", coverage: "filter-breakdown" },
      { id: "mlflow-span", metric: "MLflow Span", calculation: "errored spans / eligible spans", coverage: "filter-breakdown" },
      { id: "indexing", metric: "Indexing", calculation: "failed operations / eligible operations", coverage: "filter-breakdown" },
      { id: "transcription", metric: "Transcription", calculation: "failed operations / eligible operations", coverage: "filter-breakdown" },
      { id: "translation", metric: "Translation", calculation: "failed operations / eligible operations", coverage: "filter-breakdown" },
    ],
    notes: [
      "Rates are compared, never summed: each uses its own final record key and eligible denominator",
      "Rate provenance only \u2014 not root-cause analysis",
    ],
    decisions: [
      { id: "failure-classification", label: "Failure classification", pendingState: "definition" },
      { id: "indexing-partial-failure", label: "Indexing partial-failure rule", pendingState: "definition" },
      { id: "mlflow-span-grain", label: "MLflow Span grain (span or training run)", pendingState: "definition" },
    ],
  },

  operationalControlCoverage: {
    eyebrow: "CONTROL COVERAGE DETAILS",
    title: "Operational control coverage",
    description: "What each control needs before it could be calculated",
    bannerMessage:
      "NO NUMERIC AGGREGATION IS AUTHORIZED FOR THIS SECTION",
    controls: [
      { id: "training-reproducibility", label: "Training Reproducibility", pendingState: "definition", missingRule: "Reproducible-run definition", fieldFamily: "Training / lineage" },
      { id: "audit-logging", label: "Audit Logging", pendingState: "calculation", missingRule: "Required audit-event set", fieldFamily: "Audit / application" },
      { id: "tool-usage-compliance", label: "Tool Usage Compliance", pendingState: "calculation", missingRule: "Allowed-tool policy", fieldFamily: "Tool / agent" },
      { id: "model-governance", label: "Model Governance", pendingState: "calculation", missingRule: "Eligible-model policy", fieldFamily: "Model registry / evaluation" },
      { id: "environment-compliance", label: "Environment Compliance", pendingState: "calculation", missingRule: "Environment policy", fieldFamily: "Environment / application" },
    ],
    contextRows: [],
    notes: [
      "No compliance score is derived from these states",
      "Field families indicate where evidence would come from, not that it is available",
    ],
  },

  safetyAndSecurityReadiness: {
    eyebrow: "SAFETY AND SECURITY READINESS",
    title: "Safety and security readiness",
    description: "Which evaluator and test outputs are usable",
    bannerMessage:
      "ILLUSTRATIVE VALUES \u2014 EVALUATOR COVERAGE PENDING VALIDATION",
    readiness: [
      { id: "safety-evaluation-score", label: "Safety Evaluation Score", pendingState: "calculation" },
      { id: "mlflow-safety-score", label: "MLflow Safety Score", value: "0.91 / 1" },
      { id: "pii-leakage", label: "PII Leakage (Agent Only)", pendingState: "data" },
      { id: "upia", label: "UPIA", pendingState: "test-results" },
    ],
    contextRows: [
      { id: "mlflow-safety", metric: "MLflow Safety Score", calculation: "AVG(Safety)", scale: "0\u20131", latest: "0.91 / 1", coverage: "data" },
    ],
    notes: [
      "The illustrative MLflow value is neutral: not a favorable state and not a threshold result",
      "Not an incident, breach, attack, or remediation view",
    ],
    decisions: [
      { id: "evaluator-coverage", label: "Evaluator coverage", pendingState: "evaluator-coverage" },
    ],
  },
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`);
console.log(`wrote ${OUT}`);
