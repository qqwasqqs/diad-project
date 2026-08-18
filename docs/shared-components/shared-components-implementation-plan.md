# Shared Dashboard Components Design Implementation Plan

## Objective

Design a reusable visual component system for the four AI Observability
dashboards before Next.js implementation begins. This stage produces one
reviewable raster design specimen for every identified shared component. It
does not implement React components, API contracts, or metric calculations.

## Evidence boundary

- The approved Executive, Product Owner, Technical Teams, and Operations main
  views are visual and semantic references.
- Existing calculation specifications remain authoritative for metric meaning.
- A shared visual component does not imply that two similarly presented metrics
  have the same event grain, formula, denominator, or API contract.
- Every value in the component specimens is illustrative.
- Missing telemetry or unresolved calculation rules are never represented as
  zero, healthy, or complete.

## Design-system rules applied to every specimen

1. Use the established dashboard family: forest-green navigation accents,
   warm-white canvas, white surfaces, charcoal text, thin neutral borders,
   restrained shadows, and modest corner radii.
2. Use blue, indigo, cyan, and violet for neutral data series.
3. Use green only for a confirmed favorable state and red only for a confirmed
   risk or failure state. Pending states use neutral or amber treatment.
4. Status is always communicated by text and, when useful, an icon; color is
   never the only status signal.
5. Use one consistent spacing, typography, icon, border, and focus treatment.
6. Make all visible labels readable and avoid decorative or unsupported data.
7. Preserve a clear hierarchy: component name, primary information, supporting
   information, and state/explanation.
8. Line-chart specimens use consistent chart anatomy: descriptive title,
   visible units, stable legend placement, clear axes, tooltip affordance, and
   an accessible summary/list affordance.
9. Repeated metric names and series retain stable colors within the catalog.
10. Pending states distinguish `DATA`, `DEFINITION`, `CALCULATION`, `SCALE`,
    `THRESHOLD`, `TEST RESULTS`, and `FILTER BREAKDOWN` states.

## Component architecture

### Layer 1: application foundations and shell

1. `AppSidebar`
2. `DashboardHeader`
3. `GlobalFilterBar`
4. `IllustrativeValuesBanner`
5. `DashboardSection`
6. `Panel`
7. `DetailDrawerShell`

### Layer 2: metric and state primitives

8. `MetricCard`
9. `MetricCallout`
10. `MetricListRow`
11. `MetricGroup`
12. `PendingMetricState`
13. `PositiveNegativeSplit`
14. `SupportingStats`
15. `HorizontalMetricBar`
16. `EmptyEvidencePanel`

### Layer 3: composed domain widgets

17. `EndToEndLatencyMetric`
18. `SessionQuerySummary`
19. `SessionQueryTrend`
20. `FeedbackSatisfactionMetric`
21. `ApiErrorRateMetric`
22. `ServicePathLatencyTrend`
23. `QualityEvaluationTrend`
24. `FailureRateGrid`
25. `RuntimeContextList`
26. `SafetyReadinessGroup`

## Image deliverables

Each component receives one standalone landscape design specimen in this folder.
The filename uses kebab case and the suffix `-component-01.png`. The specimen
shows the component at implementation-oriented fidelity on a neutral catalog
canvas rather than embedding it in a complete persona dashboard.

| # | Component | Planned image |
| --- | --- | --- |
| 1 | AppSidebar | `app-sidebar-component-01.png` |
| 2 | DashboardHeader | `dashboard-header-component-01.png` |
| 3 | GlobalFilterBar | `global-filter-bar-component-01.png` |
| 4 | IllustrativeValuesBanner | `illustrative-values-banner-component-01.png` |
| 5 | DashboardSection | `dashboard-section-component-01.png` |
| 6 | Panel | `panel-component-01.png` |
| 7 | DetailDrawerShell | `detail-drawer-shell-component-01.png` |
| 8 | MetricCard | `metric-card-component-01.png` |
| 9 | MetricCallout | `metric-callout-component-01.png` |
| 10 | MetricListRow | `metric-list-row-component-01.png` |
| 11 | MetricGroup | `metric-group-component-01.png` |
| 12 | PendingMetricState | `pending-metric-state-component-01.png` |
| 13 | PositiveNegativeSplit | `positive-negative-split-component-01.png` |
| 14 | SupportingStats | `supporting-stats-component-01.png` |
| 15 | HorizontalMetricBar | `horizontal-metric-bar-component-01.png` |
| 16 | EmptyEvidencePanel | `empty-evidence-panel-component-01.png` |
| 17 | EndToEndLatencyMetric | `end-to-end-latency-metric-component-01.png` |
| 18 | SessionQuerySummary | `session-query-summary-component-01.png` |
| 19 | SessionQueryTrend | `session-query-trend-component-01.png` |
| 20 | FeedbackSatisfactionMetric | `feedback-satisfaction-metric-component-01.png` |
| 21 | ApiErrorRateMetric | `api-error-rate-metric-component-01.png` |
| 22 | ServicePathLatencyTrend | `service-path-latency-trend-component-01.png` |
| 23 | QualityEvaluationTrend | `quality-evaluation-trend-component-01.png` |
| 24 | FailureRateGrid | `failure-rate-grid-component-01.png` |
| 25 | RuntimeContextList | `runtime-context-list-component-01.png` |
| 26 | SafetyReadinessGroup | `safety-readiness-group-component-01.png` |

## Execution sequence

### Phase 1: establish the shared visual system

Generate and review the seven shell/foundation specimens first. Their spacing,
typography, surface, focus, and control decisions become constraints for every
later component.

### Phase 2: establish reusable primitives

Generate the nine metric/state primitives. Check that they support normal,
pending, unavailable, and interactive states without changing the component's
basic geometry.

### Phase 3: compose domain widgets

Generate the ten domain widgets from the approved primitives. Preserve the
canonical metric boundaries:

- End-to-End Latency remains P95 at request grain.
- Session/query summary and trend use one shared calculation family.
- API Error Rate is not silently equated with Technical Inference Error Rate.
- Service-path component times remain non-additive.
- Quality series use compatible scales only.
- Safety values remain neutral or pending until scale, calculation, coverage,
  and thresholds are approved.

### Phase 4: catalog verification

For each image verify:

- filename and component identity;
- visual-family cohesion;
- readable and accurate labels;
- no unsupported extra metric;
- no missing state shown as zero;
- consistent units, legend order, and recurring-series color;
- status meaning conveyed without color alone;
- sufficient visible control size and focus treatment;
- component is distinguishable from its surrounding catalog canvas.

## Risks and controls

| Risk | Control |
| --- | --- |
| Generated text contains spelling errors | Inspect every image and regenerate when component-critical text is wrong. |
| A specimen becomes a full dashboard | Require one focused component on a neutral component-catalog canvas. |
| Similar-looking metrics are treated as identical | Keep domain data definitions outside the generic presentation primitives. |
| Green/red implies an unapproved threshold | Use neutral/amber styling unless status meaning is explicitly approved. |
| Charts mix incompatible units or score scales | Declare unit and scale per series; split incompatible series. |
| The catalog becomes inconsistent over multiple generations | Reuse the same reference dashboards and shared prompt constraints for every image. |

## Completion criteria

This design stage is complete when:

- all 26 named PNG specimens exist in this folder;
- every image passes the verification checklist above;
- a catalog README links every component to its image;
- semantic conflicts are recorded rather than hidden;
- no Next.js implementation is claimed or implied.

## Confirmed facts

- The four approved/candidate dashboard views share a recognizable visual
  family and common global controls.
- The project documentation already defines canonical calculations for several
  repeated metrics and explicitly reuses some definitions across personas.
- All dashboard values in the supplied concepts are illustrative.

## Likely interpretations

- A three-layer component system will reduce visual duplication while retaining
  persona-specific compositions.
- One configurable chart primitive should underlie the domain-specific trend
  widgets; line count alone is not a useful component boundary.

## Assumptions

- The component images are design specifications, not pixel-perfect screenshots
  of an existing component library.
- The eventual application will provide aggregated values through Splunk or an
  approved API boundary.

## Missing evidence

- Current proprietary Next.js source, existing component library, charting
  dependency, design tokens, responsive breakpoints, and API response shapes.
- Approved production thresholds and complete accessibility test results.
