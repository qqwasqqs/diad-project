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

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`);
console.log(`wrote ${OUT}`);
