# Product Owner Dashboard Main-View Evidence Package

This package implements step 9 of the [Persona Dashboard Design Procedure](../../../dashboard-design-procedure.md) for the approved [Product Owner main view](../product-owner-dashboard-concept-01.png). It documents calculation-bearing elements and explicit pending states only; it does not approve clickability or detail views.

## Shared evidence boundary

### Confirmed facts

- The screen uses `Last 30 days`, `All business units`, `All projects`, `All channels`, and `Export` in the established order.
- The Product Owner mapping supplies 49 KPI rows with fields and some formulas.
- React consumes analytics through Splunk REST APIs; no approved Splunk search or response contract is supplied.
- The documented Product Owner purpose includes feature usage and workflow completion, but the supplied mapping provides no feature identifier, feature-usage formula, workflow terminal state, or completion formula.

### Likely interpretations

- Adoption, satisfaction, latency, and aggregated response-quality signals are appropriate Product Owner main-view concerns.
- Technical diagnostics, raw prompts/responses, raw errors, user identifiers, and model/deployment configuration remain outside this main view.

### Assumptions

- All shown figures, chart trajectories, channel proportions, and colors are illustrative. None is a validated target or threshold state.
- Splunk or an approved API normalizes, correlates, deduplicates, filters, and aggregates; the React view renders values and explicit availability states.

### Missing evidence and client decisions

- Timestamp/timezone, refresh, loading, empty, stale-data, API-error, access, export, retry/deduplication, and partial-attribution rules.
- An approved feature identifier/event/formula and a workflow terminal-state/denominator formula.
- Attribution contracts that show whether each KPI can honor business-unit, project, and channel selection.

## Approval Gate 2 inventory

| Approved-image element | Product Owner specification | Feasibility |
| --- | --- | --- |
| Shared filters and illustrative-value banner | [Global filters and illustrative state](global-filters-and-illustrative-state.md) | Partially supported |
| Session & Query Volume card and adoption trend | [Adoption and engagement](adoption-and-engagement.md) | Derivable |
| User Satisfaction Rate, in both visible placements | [User Satisfaction Rate](user-satisfaction-rate.md) | Partially supported |
| End-to-End Latency, in both visible placements | [End-to-End Latency](end-to-end-latency.md) | Supported |
| Workflow Completion | [Workflow Completion status](workflow-completion-status.md) | Pending |
| Channel mix | [Channel mix](channel-mix.md) | Derivable |
| Groundedness, Relevance Quality, and Intent Resolution trend | [Experience and response quality trend](experience-and-response-quality-trend.md) | Supported/derivable by series |
| Retrieval Quality and Task Adherence support values | [Supporting quality scores](supporting-quality-scores.md) | Supported |
| Feature usage evidence | [Feature usage evidence status](feature-usage-evidence-status.md) | Pending |
| Safety Evaluators | [Safety Evaluators status](safety-evaluators-status.md) | Conflicting/partially supported |
| MLflow Safety Score | [MLflow Safety Score](mlflow-safety-score.md) | Derivable; scale decision required |
| PII Leakage (Agent Only) | [PII Leakage status](pii-leakage-agent-only-status.md) | Partially supported/data pending |
| UPIA | [UPIA status](upia-status.md) | Derivable/test-results pending |

## Coverage check

Every visible numerical value, rate, trend, chart series, percentage split, and explicit pending state in the approved image is documented above. The duplicated User Satisfaction and End-to-End Latency callouts use the same canonical definition as their corresponding headline cards; they do not create a second calculation. Feature usage and workflow completion remain explicit `DATA PENDING` states rather than invented metrics.

No clickability, drawer, navigation, export behavior, or detail-view image is approved by this Gate 2 package.
