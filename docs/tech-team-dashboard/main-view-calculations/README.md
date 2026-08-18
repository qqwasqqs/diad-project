# Technical Teams Main-View Calculation Specifications

These specifications implement Step 9 of the [Persona Dashboard Design Procedure](../../../dashboard-design-procedure.md) for the approved [`tech-team-dashboard-alternative-02.png`](../tech-team-dashboard-alternative-02.png) main view.

## Shared dashboard rules

- **Scope shown:** Last 30 days, business unit, project, and channel.
- **Status:** every numeric value in the approved image is illustrative; targets, thresholds, timezone, refresh behaviour, rounding, and no-data/stale/API-error handling are not approved.
- **Filter rule:** a value may apply a business-unit, project, or channel filter only when its source event is reliably attributed through an approved Splunk correlation/enrichment contract. Otherwise show `FILTER BREAKDOWN UNAVAILABLE` or `DATA PENDING`, never an unfiltered portfolio value.
- **Implementation boundary:** Splunk or an approved API normalizes, correlates, deduplicates, filters, and aggregates; the React dashboard displays the resulting value and explicit state.
- **Persona boundary:** these specifications support Technical Teams diagnosis. They do not authorize raw prompts, responses, sensitive values, raw error messages, or cross-persona detail views.

## Approval Gate 2 inventory

| Approved-image element | Specification | Feasibility |
|---|---|---|
| Global filters and illustrative-state banner | [Global Filters and Illustrative State](global-filters-and-illustrative-state.md) | Partially supported |
| Request-path latency trend | [Request-path health](request-path-health-chart.md) | Supported / derivable by series |
| Request Throughput | [Request Throughput](request-throughput.md) | Derivable |
| Inference Error Rate | [Inference Error Rate](inference-error-rate.md) | Derivable |
| Pipeline Duration avg | [Pipeline Duration](pipeline-duration.md) | Supported |
| Indexing / AI Services avg | [Indexing / AI Services Latency](indexing-ai-services-latency.md) | Partially supported |
| Failure localization | [Failure Localization](failure-localization-chart.md) | Derivable / partially supported by rate |
| Cost per Request | [Cost per Request](cost-per-request.md) | Derivable |
| Token Usage / Request | [Token Usage / Request](token-usage-per-request.md) | Supported |
| Token Throughput | [Token Throughput](token-throughput-status.md) | Pending definition |
| Available Token Limit | [Available Token Limit](available-token-limit-status.md) | Conflicting |
| Cache Hit Ratio | [Cache Hit Ratio](cache-hit-ratio-status.md) | Conflicting |
| AI and model quality trend | [AI and Model Quality](ai-model-quality-chart.md) | Supported |
| Retrieval Quality | [Retrieval Quality](retrieval-quality.md) | Supported |
| MLflow Correctness | [MLflow Correctness](mlflow-correctness.md) | Supported |
| Safety Evaluation Score | [Safety Evaluation Score](safety-evaluation-score-status.md) | Conflicting |
| MLflow Safety Score | [MLflow Safety Score](mlflow-safety-score.md) | Supported |
| PII Leakage (Agent Only) | [PII Leakage](pii-leakage-agent-only-status.md) | Conflicting / data pending |
| UPIA | [UPIA](upia-status.md) | Partially supported / test results pending |

No clickability or detail-view image is approved by this review. Approval Gate 2 concerns only the calculation documentation and the stated evidence gaps.
