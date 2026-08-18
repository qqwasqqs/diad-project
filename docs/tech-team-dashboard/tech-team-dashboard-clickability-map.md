# Technical Teams Dashboard Clickability and Detail-View Map

**Main-view authority:** [`tech-team-dashboard-alternative-02.png`](tech-team-dashboard-alternative-02.png)  
**Calculation authority:** [`main-view-calculations/README.md`](main-view-calculations/README.md)  
**Approval status:** Gates 2 and 3 approved. All six selected detail drawers are approved and included in the Gate 4 consistency review.

## Dashboard-wide interaction rules

- A click opens a right-side drawer over the Technical Teams main view; the main view stays visible and dims behind it.
- Preserve the selected time period, business unit, project, and channel filters in the drawer.
- Each drawer deepens one visible main-view element. It must not combine separate elements merely because they share a panel.
- A selected scope that cannot be attributed shows `FILTER BREAKDOWN UNAVAILABLE` or `DATA PENDING`, never an unfiltered or zero value.
- No drawer exposes raw prompts, responses, sensitive values, identifiers, raw error messages, or content outside the Technical Teams persona.
- All values and chart shapes in proposed images remain illustrative until telemetry contracts and thresholds are validated.

## Clickability decisions

| Visible main-view element | Decision | Purpose of its drawer | Evidence / boundary | Detail design status |
|---|---|---|---|---|
| **Request-path latency chart** — End-to-End P95, Model Response avg, Retrieval avg, Tool Call avg | **Clickable** | Compare the four latency measures, their calculation type, and their 30-day illustrated trajectory. | [Request-path health calculation](main-view-calculations/request-path-health-chart.md). Component values are not additive. | [Approved drawer](tech-team-request-path-latency-chart-drawer.md) |
| **Request-path diagnostics list** — Request Throughput, Inference Error Rate, Pipeline Duration avg, Indexing / AI Services avg | **Clickable** | Review the four list metrics as one diagnostic context element, without the latency chart. | Four separate calculation specifications. Pipeline/indexing remain asynchronous and are not added to request latency. | [Approved drawer](tech-team-request-path-diagnostics-list-drawer.md) |
| **Failure localization** chart | **Clickable** | Investigate the eight failure-rate comparisons, their selected metric trend, and safe category context. | [Failure localization calculation](main-view-calculations/failure-localization-chart.md). No raw error messages. | [Approved drawer](tech-team-failure-localization-drawer.md) |
| **Capacity and efficiency** panel | **Clickable** | Review Cost per Request, Token Usage / Request, and the three transparent pending-definition states. | Cost/token and pending-state specifications. No invented capacity/caching value. | [Approved drawer](tech-team-capacity-efficiency-drawer.md) |
| **AI and model quality** panel | **Clickable** | Review compatible 1–5 quality scores, the separate 0–1 MLflow Correctness score, and Retrieval Quality. | Quality calculation specifications. Scales remain separate. | [Approved drawer](tech-team-ai-model-quality-drawer.md) |
| **Evaluator readiness and security tests** panel | **Clickable** | Review evaluator readiness, MLflow Safety Score, and the documented blockers for the three pending states. | Safety/security specifications. No incident, breach, or attack claim. | [Approved drawer](tech-team-evaluator-readiness-drawer.md) |
| Global filters, Export, illustrative-values banner | **Not a detail entry** | They control scope/state rather than answer a new diagnostic question. | [Global filter specification](main-view-calculations/global-filters-and-illustrative-state.md). | N/A |

## Current Gate 3 sequence

1. Request-path latency chart drawer.
2. Request-path diagnostics-list drawer.
3. Failure localization drawer.
4. Capacity and efficiency drawer.
5. AI and model quality drawer.
6. Evaluator readiness and security-tests drawer.

All six selected drawers are approved.

## Confirmed facts

- The selected main view visibly contains the six clickable elements named above.
- The Executive Dashboard uses a contextual right-side drawer pattern for a selected card.
- The Technical Teams calculation specifications define the visible metrics, their formulas, and their pending states.

## Likely interpretations

- The Request-path health card deliberately contains two distinct interactive elements: its four-series latency chart and its four-row diagnostic list.
- A compact, non-scrolling drawer is the preferred first design. Scroll is allowed only when a later evidence-supported element cannot fit without sacrificing readability.

## Assumptions and client questions

Assumptions: the drawer width and exact close/back controls follow the Executive visual family; the drawer opens from the right; all images use illustrative values.

Questions: Which drawer should have an explicit link to the Splunk-native developer dashboard, if any? What loading, empty, stale-data, API-error, refresh, accessibility, and export behaviour is required? What role restrictions apply to each drawer?

## Superseded preliminary proposals

The earlier page-level detail documents remain in this folder for traceability, but they are not current authority. This map supersedes their page-navigation and over-grouped interaction decisions.
