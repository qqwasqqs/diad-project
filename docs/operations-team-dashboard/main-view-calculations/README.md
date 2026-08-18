# Operations Team Main-View Evidence Package

These specifications implement Step 9 of the [Persona Dashboard Design
Procedure](../../../dashboard-design-procedure.md) for the approved
[`operations-team-dashboard-concept-01-revised.png`](../operations-team-dashboard-concept-01-revised.png)
main view. They do not decide clickability or design a detail view.

## Shared evidence boundary

### Confirmed facts

- The image uses `Last 30 days`, `All business units`, `All projects`, `All
  channels`, and `Export` in the approved family order.
- The Operations mapping supplies 29 metrics, source fields, and some formulas.
- React dashboards consume observability data through Splunk REST APIs; no
  Splunk search or response contract is available.

### Likely interpretations

- Splunk or an approved API should normalize, correlate, deduplicate, filter,
  and aggregate; React should render returned values and explicit states.
- Operations requires aggregate triage, not raw error messages or traces, on
  this main view.

### Assumptions

- All pictured values, bar lengths, dates, and chart trajectories are
  illustrative. Color is not an approved threshold state.
- A metric may use global dimensions only when the source event is reliably
  attributed through an approved field or Splunk correlation/enrichment rule.

### Missing evidence and client decisions

- Timestamp/timezone, refresh, no-data, stale-data, API-error, access, export,
  partial-attribution, threshold, and metric-specific retry/deduplication rules.
- API/search response contracts and the fields/contract needed for uptime/SLA,
  CPU/memory, system load, and real-time alerts.

## Approval Gate 2 inventory

| Approved-image element | Specification | Feasibility |
| --- | --- | --- |
| Shared filters and illustrative-values banner | [Global filters and illustrative state](global-filters-and-illustrative-state.md) | Partially supported |
| Operational situation cards, requested coverage, and alert-feed state | [Operational situation](operational-situation.md) | Supported/derivable/pending by item |
| End-to-End Latency | [End-to-End Latency](end-to-end-latency.md) | Supported |
| API Error Rate | [API Error Rate](api-error-rate.md) | Derivable |
| Pipeline Failure Rate | [Pipeline Failure Rate](pipeline-failure-rate.md) | Derivable |
| Service-path latency trend | [Service-path stability](service-path-stability.md) | Supported/derivable by series |
| Request Throughput | [Request Throughput](request-throughput.md) | Derivable |
| Pipeline Duration avg | [Pipeline Duration](pipeline-duration.md) | Derivable |
| Indexing / AI Services avg | [Indexing / AI Services Latency](indexing-ai-services-latency.md) | Partially supported |
| Token Throughput | [Token Throughput status](token-throughput-status.md) | Conflicting/pending |
| Failure surface | [Failure surface](failure-surface.md) | Derivable/partially supported by rate |
| Operational control coverage | [Operational control coverage](operational-control-coverage.md) | Pending/partially supported |
| Safety and security readiness | [Safety and security readiness](safety-and-security-readiness.md) | Pending/derivable by item |
| Safety Evaluation Score | [Safety Evaluation Score](safety-evaluation-score-status.md) | Conflicting/partially supported |
| MLflow Safety Score | [MLflow Safety Score](mlflow-safety-score.md) | Derivable; scale decision required |
| PII Leakage (Agent Only) | [PII Leakage](pii-leakage-agent-only-status.md) | Partially supported/data pending |
| UPIA | [UPIA](upia-status.md) | Derivable/test results pending |

## Approved-main-view coverage check

The inventory documents every calculation-bearing KPI and explicit pending state
visible in the approved main view. The not-mapped Uptime/SLA, CPU/Memory, System
Load, and Alert feed requirements remain visibly pending rather than becoming
invented measurements.

No clickability, drawer, navigation, export behavior, or detail-view image is
approved by this Gate 2 package.
