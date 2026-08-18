# Shared KPI components — Fluent 2

## Purpose

This catalog identifies only KPI-display components that repeat across the four
dashboard concepts. It excludes the sidebar, dashboard title, global filters,
export action, illustrative-values banner, and generic page-layout containers.

The images are implementation-oriented visual references for a future Next.js
application using Fluent 2. They do not claim that React components, data
contracts, or production calculations already exist.

## Recommended shared components

### KPI cards and status items

| Shared React component | Present in dashboards | Configurable content |
| --- | --- | --- |
| `EndToEndLatencyCard` | Executive, Product Owner, Operations | value, percentile label, unit, state |
| `ApiErrorRateCard` | Executive, Operations | value, supporting label, state |
| `SessionQueryVolumeCard` | Executive, Product Owner | query count, session count, queries/session |
| `FeedbackSatisfactionCard` | Executive, Product Owner | title, positive rate, negative rate, response state |
| `SafetyEvaluationItem` | Executive, Product Owner, Operations, Technical Teams | title variant, numeric value or pending state |
| `MlflowSafetyItem` | Executive, Product Owner, Operations, Technical Teams | score, scale, or scale-pending state |
| `PiiLeakageItem` | Executive, Product Owner, Operations, Technical Teams | numeric result or data-pending state |
| `UpiaItem` | Product Owner, Operations, Technical Teams | test result or test-results-pending state |

### Shared composed widgets

| Shared React component | Present in dashboards | Configurable content |
| --- | --- | --- |
| `SafetyReadinessGroup` | All four dashboards | section title, visible KPI items, item state/value |
| `SessionQueryTrend` | Executive, Product Owner | sessions series, queries series, supporting statistics |
| `ServicePathLatencyTrend` | Operations, Technical Teams | four latency series, units, period, context note |
| `QualityEvaluationTrend` | Product Owner, Technical Teams | compatible 1–5 series and supporting scores |
| `FailureRateGrid` | Operations, Technical Teams | workload labels, rates, column count |
| `RuntimeContextList` | Operations, Technical Teams | throughput, duration, indexing latency, optional fourth row |

## Recommended internal composition

```text
SafetyReadinessGroup
├── SafetyEvaluationItem
├── MlflowSafetyItem
├── PiiLeakageItem
└── UpiaItem (optional for Executive)

SessionQueryTrend
ServicePathLatencyTrend     ── use one internal LineChart primitive
QualityEvaluationTrend
```

The three trend widgets should share one internal chart primitive accepting
series, labels, colors, units, axes, and accessible tabular data. The domain
wrappers remain separate because they enforce different units and semantic
rules. The number of lines alone should not determine the React component.

## Fluent 2 design direction

- Use Fluent `Card`, `CardHeader`, `Text`, `Badge`, `Divider`, `Tooltip`, and
  Fluent System Icons where their semantics fit.
- Use Fluent design tokens for color, typography, spacing, border radius,
  stroke, and elevation rather than hard-coded visual values.
- Keep surfaces neutral and reserve semantic colors for confirmed status.
- Pair every status color with text and, where useful, an icon.
- Use sentence case, concise labels, readable units, and a consistent
  information order: label, value/state, then supporting context.
- The chart renderer may require a separate chart package; keep it behind an
  application-owned chart adapter so the domain widgets do not depend directly
  on a vendor API.

## Components intentionally not merged

- `ApiErrorRateCard` is not the same metric as Technical Teams'
  `Inference Error Rate`; they may share a private visual primitive but should
  retain separate domain components and calculation contracts.
- End-to-End P95 is not interchangeable with average model, retrieval, or tool
  latency.
- Quality series may share a chart only when their scales are compatible.
- Pending data is never displayed as zero or as a healthy state.

## Image catalog

### KPI cards

| Component | Image |
| --- | --- |
| `EndToEndLatencyCard` | [View Fluent 2 specimen](end-to-end-latency-card-fluent-2-01.png) |
| `ApiErrorRateCard` | [View Fluent 2 specimen](api-error-rate-card-fluent-2-01.png) |
| `SessionQueryVolumeCard` | [View Fluent 2 specimen](session-query-volume-card-fluent-2-01.png) |
| `FeedbackSatisfactionCard` | [View Fluent 2 specimen](feedback-satisfaction-card-fluent-2-01.png) |

### Safety KPI items and group

| Component | Image |
| --- | --- |
| `SafetyEvaluationItem` | [View Fluent 2 specimen](safety-evaluation-item-fluent-2-01.png) |
| `MlflowSafetyItem` | [View Fluent 2 specimen](mlflow-safety-item-fluent-2-01.png) |
| `PiiLeakageItem` | [View Fluent 2 specimen](pii-leakage-item-fluent-2-01.png) |
| `UpiaItem` | [View Fluent 2 specimen](upia-item-fluent-2-01.png) |
| `SafetyReadinessGroup` | [View Fluent 2 specimen](safety-readiness-group-fluent-2-01.png) |

### Charts and metric groups

| Component | Image |
| --- | --- |
| `SessionQueryTrend` | [View Fluent 2 specimen](session-query-trend-fluent-2-01.png) |
| `ServicePathLatencyTrend` | [View Fluent 2 specimen](service-path-latency-trend-fluent-2-01.png) |
| `QualityEvaluationTrend` | [View Fluent 2 specimen](quality-evaluation-trend-fluent-2-01.png) |
| `FailureRateGrid` | [View Fluent 2 specimen](failure-rate-grid-fluent-2-01.png) |
| `RuntimeContextList` | [View Fluent 2 specimen](runtime-context-list-fluent-2-01.png) |

## Suggested implementation order

1. Create private presentation primitives: `KpiCard`, `KpiStatusItem`,
   `MetricListRow`, and `LineChart`.
2. Create the eight named KPI/status components by configuring those
   primitives with domain-safe labels and states.
3. Create the five chart/list widgets using typed data contracts.
4. Compose `SafetyReadinessGroup` from the four safety KPI items.
5. Place the shared components into each persona dashboard and verify that the
   selected filters and data contracts apply to every displayed value.

The private primitives are implementation tools, not additional business KPIs.
Keep the exported domain components explicit so similarly styled but
semantically different values cannot be substituted accidentally.

## Confirmed facts

- The dashboard concepts repeat the KPI and chart patterns mapped above.
- The four dashboards use different titles for some safety and feedback items.
- The supplied values are illustrative.

## Likely interpretations

- Executive `User Feedback` and Product Owner `User Satisfaction Rate` can use
  one configurable presentation component.
- The repeated safety rows are best implemented as individual KPI items inside
  one configurable group.

## Assumptions

- Fluent UI React v9 (`@fluentui/react-components`) will be the Fluent 2 base
  library for the future Next.js application.
- The application will use an application-owned adapter for charts.

## Missing evidence

- Existing proprietary React source and component conventions.
- Approved charting package, responsive breakpoints, design-token overrides,
  API response shapes, and final accessibility behavior.
- Confirmation that feedback and satisfaction use one production calculation.
