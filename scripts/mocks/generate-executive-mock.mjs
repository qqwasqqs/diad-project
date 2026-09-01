/*
  Regenerates public/mocks/new-pages/executive-dashboard.json.

  Run: node scripts/mocks/generate-executive-mock.mjs

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
  "../../public/mocks/new-pages/executive-dashboard.json",
);

const DAYS = 90;
const START = new Date(Date.UTC(2026, 1, 19));

const dates = Array.from({ length: DAYS }, (_, i) => {
  const d = new Date(START);
  d.setUTCDate(START.getUTCDate() + i);
  return d.toISOString().slice(0, 10);
});

/*
  Wobble around a base value, plus the modest late rise the approved chart shows.
  The rise is anchored to the final days of the range rather than a fixed index,
  so the shape holds whether the route slices 7, 30, or 90 days.
*/
const RISE_DAYS = 8;
const shape = (i, base, amp) => {
  const wobble = Math.sin(i / 1.9) * amp + Math.sin(i / 4.7) * amp * 0.55;
  const intoRise = i - (DAYS - RISE_DAYS);
  const rise = intoRise > 0 ? Math.pow(intoRise, 1.5) * (base / 340) : 0;
  return Math.max(0, base + wobble + rise);
};

const series = (id, label, base, amp) => ({
  id,
  label,
  points: dates.map((x, i) => ({ x, y: Math.round(shape(i, base, amp)) })),
});

const payload = {
  generatedAt: "2026-09-01T00:00:00.000Z",
  note: "Illustrative values. Not production telemetry. Targets and thresholds pending validation.",

  pulse: [
    {
      id: "end-to-end-latency",
      label: "End-to-End Latency",
      amount: 1.2,
      prefix: "P95 ",
      unit: " s",
      decimals: 2,
    },
    {
      id: "api-error-rate",
      label: "API Error Rate (Inference Errors)",
      amount: 1.14,
      unit: "%",
      decimals: 2,
    },
    {
      id: "session-query-volume",
      label: "Session & Query Volume",
      amount: 316,
      unit: "K",
      decimals: 0,
      suffix: "queries",
      supportingParts: [
        { amount: 4.6, decimals: 1, unit: " queries/session" },
        { amount: 8.2, decimals: 1, unit: " min avg session" },
      ],
    },
    {
      id: "user-feedback",
      label: "User Feedback (Thumbs Up/Down)",
      amount: 84,
      unit: "%",
      decimals: 0,
      suffix: "positive",
      max: 100,
      split: { positive: 84, negative: 16 },
    },
    {
      id: "cost-per-request",
      label: "Cost per Request",
      amount: 0.12,
      prefix: "$",
      decimals: 2,
    },
  ],

  sessionAndQueryVolume: {
    // Separate populations at different magnitudes: two axes, never summed.
    series: [
      series("sessions", "Sessions", 18000, 5200),
      series("queries", "Queries", 41000, 9000),
    ],
    /*
      Period-level values. Distinct sessions cannot be recovered by summing daily
      buckets, because a session can appear in several, so these are supplied
      rather than derived from the plotted points.
    */
    supporting: [
      { id: "queries-per-session", label: "queries/session", amount: 4.6, decimals: 1 },
      { id: "avg-session-minutes", label: "min avg session", amount: 8.2, decimals: 1 },
    ],
  },

  costByBusinessUnit: {
    // Each project cost is a subset of its business-unit total, never an addition.
    items: [
      { name: "Business Unit A", totalCost: 7.68, topProjectName: "Project A1", topProjectCost: 4.21 },
      { name: "Business Unit B", totalCost: 5.42, topProjectName: "Project B1", topProjectCost: 2.93 },
      { name: "Business Unit C", totalCost: 3.76, topProjectName: "Project C1", topProjectCost: 1.94 },
    ],
    // No approved source. Never added to the token-cost bars, never inferred.
    infrastructureCost: {
      id: "infrastructure-cost",
      label: "Infrastructure Cost",
      pendingState: "data",
    },
  },

  safetyAndRisk: [
    {
      id: "safety-evaluation-score",
      label: "Safety Evaluation Score",
      amount: 0.8,
      unit: "%",
      decimals: 1,
      suffix: "impacted requests",
    },
    { id: "mlflow-safety-score", label: "MLflow Safety Score", pendingState: "scale" },
    {
      id: "pii-leakage",
      label: "PII Leakage (Agent Only)",
      amount: 0.02,
      unit: "%",
      decimals: 2,
      suffix: "flagged",
    },
  ],
};


/*
  Detail drawers. Text follows the approved drawer specifications; every
  coverage or unresolved item stays an approved pending state rather than a
  placeholder number.
*/
payload.drawers = {
  pulse: {
    eyebrow: "EXECUTIVE PULSE DETAILS",
    title: "Executive pulse",
    description: "Portfolio view \u2022 Latency, API errors, and feedback",
    bannerMessage:
      "ILLUSTRATIVE VALUES \u2014 ATTRIBUTION AND COMPARISON PERIODS PENDING VALIDATION",
    latency: [
      { id: "p95", label: "End-to-End Latency P95", value: "1.20 s" },
      { id: "avg", label: "End-to-End Latency average", value: "0.74 s" },
      { id: "previous", label: "Previous period P95", value: "1.31 s" },
    ],
    apiStatus: [
      { id: "success", label: "Success", sharePct: 98.86 },
      { id: "client-error", label: "Client error", sharePct: 0.62 },
      { id: "server-error", label: "Server error", sharePct: 0.52 },
    ],
    feedback: [
      { id: "positive", label: "Positive", value: "84%" },
      { id: "negative", label: "Negative", value: "16%" },
      { id: "participation", label: "Anonymous participation", value: "12.4K responses" },
      // Attribution is unconfirmed for latency, API errors, and feedback.
      { id: "attribution", label: "Business unit / project attribution", pendingState: "filter-breakdown" },
    ],
    handoffs: [
      { id: "engagement", label: "Session & Query Volume", destination: "Engagement details" },
      { id: "cost", label: "Cost per Request", destination: "Cost allocation" },
    ],
    contextRows: [
      { id: "latency-calc", metric: "End-to-End Latency", calculation: "P95 and AVG of eligible request duration", coverage: "filter-breakdown" },
      { id: "api-calc", metric: "API Error Rate", calculation: "Aggregate response-status distribution", coverage: "filter-breakdown" },
      { id: "feedback-calc", metric: "User Feedback", calculation: "Share of positive and negative responses", coverage: "filter-breakdown" },
    ],
    notes: [
      "Session & Query Volume and Cost per Request are summary signals here; their own sections own the detail",
      "No previous-period comparison is shown for API errors or feedback, which have no approved comparison basis",
    ],
  },

  sessionAndQueryVolume: {
    eyebrow: "EXECUTIVE ENGAGEMENT DETAILS",
    title: "Session & Query Volume",
    description: "Portfolio view \u2022 Reach and composition",
    bannerMessage:
      "ILLUSTRATIVE VALUES \u2014 SESSION RULES AND ATTRIBUTION PENDING VALIDATION",
    summary: [
      { id: "active-users", label: "Distinct active users", value: "42.6K" },
      { id: "total-sessions", label: "Total sessions", value: "68.7K" },
      { id: "total-conversations", label: "Total conversations", value: "91.4K" },
      { id: "queries-per-user", label: "Average queries per user", value: "7.4" },
    ],
    channels: [
      { id: "web", label: "Web", queries: "154K", sessions: "34.1K", sharePct: 48.7 },
      { id: "teams", label: "Teams", queries: "96K", sessions: "20.2K", sharePct: 30.4 },
      { id: "mobile", label: "Mobile", queries: "42K", sessions: "9.1K", sharePct: 13.3 },
      { id: "api", label: "API", queries: "24K", sessions: "5.3K", sharePct: 7.6 },
    ],
    sessionDepth: [
      { id: "1", label: "1 query", sessions: "19.9K sessions", sharePct: 29 },
      { id: "2-5", label: "2\u20135 queries", sessions: "29.5K sessions", sharePct: 43 },
      { id: "6-10", label: "6\u201310 queries", sessions: "13.7K sessions", sharePct: 20 },
      { id: "11plus", label: "11+ queries", sessions: "5.6K sessions", sharePct: 8 },
    ],
    conversationContext: [
      { id: "conv-per-session", label: "Average conversations per session", value: "1.3" },
      { id: "queries-per-conv", label: "Average queries per conversation", value: "3.5" },
      // Session expiry and single-query duration rules are not confirmed.
      { id: "duration-distribution", label: "Session-duration distribution", pendingState: "data" },
    ],
    contextRows: [
      { id: "active-users-calc", metric: "Active users", calculation: "COUNT(DISTINCT user_id)", coverage: "filter-breakdown" },
      { id: "sessions-calc", metric: "Sessions", calculation: "COUNT(DISTINCT session_id)", coverage: "filter-breakdown" },
      { id: "conversations-calc", metric: "Conversations", calculation: "COUNT(DISTINCT session_id + conversation_id)", coverage: "filter-breakdown" },
      { id: "queries-per-user-calc", metric: "Queries per user", calculation: "distinct request count / distinct user count", coverage: "filter-breakdown" },
    ],
    notes: [
      "Depth bands are illustrative and require client approval",
      "Engagement is neutral evidence of reach, not a satisfaction, completion, or business-outcome claim",
      "Executive-only aggregates \u2014 no user, session, conversation, request, prompt, or response content",
    ],
  },

  costByBusinessUnit: {
    eyebrow: "EXECUTIVE COST ALLOCATION",
    title: "Cost by BU and Project",
    description: "Portfolio view \u2022 Attributed AI token cost",
    bannerMessage:
      "ILLUSTRATIVE VALUES \u2014 OWNERSHIP AND ALLOCATION RULES PENDING VALIDATION",
    portfolio: [
      { id: "token-cost", label: "Attributed AI token cost", value: "$16.86K" },
      { id: "cost-per-request", label: "Portfolio average Cost per Request", value: "$0.12" },
    ],
    infrastructureCost: { id: "infrastructure-cost", label: "Infrastructure Cost", pendingState: "data" },
    contextRows: [
      { id: "bu-calc", metric: "Business unit cost", calculation: "SUM(request_cost) GROUP BY business_unit", coverage: "filter-breakdown" },
      { id: "project-calc", metric: "Project cost", calculation: "SUM(request_cost) GROUP BY business_unit, project", coverage: "filter-breakdown" },
    ],
    notes: [
      "A project cost is a subset of its business unit, never added to it",
      "Attributed token cost only \u2014 this is not a total cost, and it excludes Infrastructure Cost",
    ],
    decisions: [
      { id: "shared-ownership", label: "Shared and cross-project ownership rule", pendingState: "definition" },
      { id: "unattributed", label: "Missing or conflicting ownership treatment", pendingState: "definition" },
    ],
  },

  safetyAndRisk: {
    eyebrow: "SAFETY & RISK DETAILS",
    title: "Safety & risk posture",
    description: "Portfolio view \u2022 What each signal can support",
    bannerMessage:
      "ILLUSTRATIVE VALUES \u2014 COVERAGE AND ATTRIBUTION PENDING VALIDATION",
    signals: [
      { id: "safety-evaluation", label: "Safety Evaluation \u2014 impacted-request rate from approved category pass/fail results", value: "0.8%" },
      { id: "mlflow-safety", label: "MLflow Safety Score \u2014 no approved scale", pendingState: "scale" },
      { id: "pii-leakage", label: "PII Leakage \u2014 flagged-evaluation rate, agent workloads only", value: "0.02%" },
    ],
    contextRows: [
      { id: "safety-calc", metric: "Safety Evaluation", calculation: "Impacted requests / evaluated requests", coverage: "data" },
      { id: "pii-calc", metric: "PII Leakage (Agent Only)", calculation: "Flagged evaluations / agent evaluations", coverage: "data" },
    ],
    notes: [
      "A PII flag is an evaluation result, not a confirmed breach",
      "No safety score is derived from category severity values",
      "Not an incident, remediation, or threshold view",
    ],
    decisions: [
      { id: "coverage", label: "Evaluation coverage", pendingState: "data" },
      { id: "attribution", label: "Business unit / project / channel attribution", pendingState: "data" },
    ],
  },
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`);
console.log(`wrote ${OUT}`);
