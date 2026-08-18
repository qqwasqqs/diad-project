# Shared Dashboard Component Design Catalog

This folder contains the implementation plan and design specimens for the
shared AI Observability dashboard component system.

The governing plan is [Shared Dashboard Components Design Implementation Plan](shared-components-implementation-plan.md).

For the implementation-focused catalog containing only repeated KPI cards,
safety indicators, charts, and metric lists using Fluent 2, see
[Shared KPI components — Fluent 2](kpi-components-fluent-2/README.md).

Images in this catalog are visual design specifications with illustrative data.
They do not confirm production calculations, telemetry availability, API
contracts, or implemented React components.

## Catalog status

The catalog contains 26 generated and reviewed component specimens in three
layers. The component names describe intended design-system boundaries; they
do not assert that corresponding Next.js components already exist.

## Layer 1: application foundations and shell

| Component | Design specimen |
| --- | --- |
| AppSidebar | [View image](app-sidebar-component-01.png) |
| DashboardHeader | [View image](dashboard-header-component-01.png) |
| GlobalFilterBar | [View image](global-filter-bar-component-01.png) |
| IllustrativeValuesBanner | [View image](illustrative-values-banner-component-01.png) |
| DashboardSection | [View image](dashboard-section-component-01.png) |
| Panel | [View image](panel-component-01.png) |
| DetailDrawerShell | [View image](detail-drawer-shell-component-01.png) |

## Layer 2: metric and state primitives

| Component | Design specimen |
| --- | --- |
| MetricCard | [View image](metric-card-component-01.png) |
| MetricCallout | [View image](metric-callout-component-01.png) |
| MetricListRow | [View image](metric-list-row-component-01.png) |
| MetricGroup | [View image](metric-group-component-01.png) |
| PendingMetricState | [View image](pending-metric-state-component-01.png) |
| PositiveNegativeSplit | [View image](positive-negative-split-component-01.png) |
| SupportingStats | [View image](supporting-stats-component-01.png) |
| HorizontalMetricBar | [View image](horizontal-metric-bar-component-01.png) |
| EmptyEvidencePanel | [View image](empty-evidence-panel-component-01.png) |

## Layer 3: composed domain widgets

| Component | Design specimen |
| --- | --- |
| EndToEndLatencyMetric | [View image](end-to-end-latency-metric-component-01.png) |
| SessionQuerySummary | [View image](session-query-summary-component-01.png) |
| SessionQueryTrend | [View image](session-query-trend-component-01.png) |
| FeedbackSatisfactionMetric | [View image](feedback-satisfaction-metric-component-01.png) |
| ApiErrorRateMetric | [View image](api-error-rate-metric-component-01.png) |
| ServicePathLatencyTrend | [View image](service-path-latency-trend-component-01.png) |
| QualityEvaluationTrend | [View image](quality-evaluation-trend-component-01.png) |
| FailureRateGrid | [View image](failure-rate-grid-component-01.png) |
| RuntimeContextList | [View image](runtime-context-list-component-01.png) |
| SafetyReadinessGroup | [View image](safety-readiness-group-component-01.png) |

## Generation and review record

The specimens were created with the built-in image-generation workflow. The
four persona dashboards were supplied as visual-family references. A shared
prompt contract required a warm-white catalog canvas, white surfaces, neutral
borders, restrained shadows, readable labels, explicit units, icon-plus-text
status, and no full dashboard shell unless the shell itself was the subject.

Each component then received a focused subject prompt based on the governing
plan. Domain-widget prompts preserved the documented semantic boundaries: P95
latency, separate session/query axes, non-additive service-path times,
compatible quality scales, workload-specific failure denominators, and
explicit pending states. One initial PendingMetricState specimen was rejected
and regenerated because it promised future data availability without evidence.

## Evidence status

### Confirmed facts

- All 26 planned PNG files are present in this folder.
- The specimens use illustrative values and are not production telemetry.
- The catalog standardizes repeated visual patterns across the four supplied
  dashboard concepts.

### Likely interpretations

- These boundaries can guide a reusable React component architecture.
- Domain widgets should compose generic presentation primitives rather than
  duplicate their styling and interaction behavior.

### Assumptions

- The images are review artifacts, not pixel-perfect implementation contracts.
- Responsive behavior will be specified when application constraints are
  available.

### Missing evidence

- Current Next.js component source, design tokens, charting library, responsive
  breakpoints, API response contracts, and approved production thresholds.
- Accessibility testing in an implemented, interactive interface.
