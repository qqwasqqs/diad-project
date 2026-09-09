# Operations Team Dashboard — Splunk Data Contract

## Purpose

This is the Splunk-facing data contract for the Operations Team main view. It
complements the shared endpoint strategy and endpoint examples:

- [Metrics endpoint](shared-dashboard-endpoints.md#1-single-metric-endpoint)
- [Timeseries endpoint](shared-dashboard-endpoints.md#2-timeseries-endpoint)

It specifies logical source fields and result aggregations, not final SPL or a
new persona-specific route. Splunk may map logical fields from indexed fields,
calculated fields, or approved lookups.

Requests use `dashboard: "operations-team"` and the section IDs
`operational-situation`, `requested-operations-coverage`,
`service-path-stability`, `failure-surface`, `operational-control-coverage`, and
`safety-and-security-readiness`.

## Privacy, filtering, and status rules

Return only aggregates, time buckets, availability states, and approved
aggregate coverage. Do not return prompts, responses, identifiers, correlation
IDs, raw errors, stack traces, safety reasons, sensitive values, or attack-test
content. Identifiers may be used inside Splunk for correlation and
deduplication only.

Apply time range, business unit, project, channel, authorization scope, and
timezone before aggregation. Each source population uses its approved event
timestamp and operation key.

| Situation | Required result |
| --- | --- |
| Selected filter cannot be reliably attributed | `FILTER_BREAKDOWN_UNAVAILABLE`, with a reason |
| Valid definition but no eligible records | `NO_DATA`, not zero |
| Definition, key, denominator, status taxonomy, or field semantics not approved | `DATA_PENDING` or `CALCULATION_PENDING`, with a reason |
| Coverage is requested | Approved aggregate eligible/included counts only; do not estimate a percentage |

Never present an unfiltered portfolio result as filtered. Do not interpret
missing telemetry as zero failures, zero latency, healthy capacity, control
compliance, safety, or service availability.

The shared endpoint status vocabulary does not contain `DEFINITION_PENDING`,
`FORMULA_PENDING`, `THRESHOLD_PENDING`, or `TEST_RESULTS_PENDING`. Return
`CALCULATION_PENDING` with a precise reason; the API/UI may map that reason to
the more specific display label.

## Required normalized source fields

| Population | Logical fields | Purpose / unresolved requirement |
| --- | --- | --- |
| User/API request | `request_key`, request timestamps, `response_latency_ms`, terminal response status, HTTP status, API error code, attributable dimensions, eligibility marker | Confirm one terminal request outcome, retry behavior, P95 convention, and error taxonomy. |
| Model, retrieval, and tool operations | operation/span key, `request_key`, operation timestamp, `model_latency_ms`, `query_latency_ms`, `tool_call_latency_ms`, operation status/type, attributable dimensions | Confirm units, eligible terminal operations, multiple-operation roll-ups, and cross-source attribution. |
| Pipeline and activity runs | `pipeline_run_key`/`runId`, activity-run key, pipeline/activity name, start/end, duration, final status, failure type/code, trigger, retry lineage, attributable dimensions | Confirm final-state taxonomies and whether reruns are new executions or retries of one logical run. |
| Job and training runs | `job_key`/`job_id`, `training_run_key`, timestamps, terminal status, failure code, attributable dimensions | Confirm eligible denominators and final-outcome rules. |
| MLflow spans | `span_key`, training/request/model correlation, timestamp, `span_status`, error classification, evaluator version/population | Resolve whether the failure metric is span-based or training-run-based. |
| Indexing, transcription, and translation operations | operation key/type, timestamps/duration, terminal status, failed-document count where applicable, attributable dimensions | Confirm partial-failure treatment, final states, and comparable units. |
| Request traffic | `request_key`, event timestamp, attributable dimensions | Confirm the throughput window and period roll-up: elapsed-period, average buckets, peak, or latest. |
| Safety evaluations and tests | evaluation/test-case key, request/model key, timestamp/version/population, Foundry category results, `mlflow_safety_rating`, `sensitive_data_leakage`, UPIA result fields, agent/test eligibility, attributable dimensions | Keep online, offline, agent-only, and test populations separate; confirm coverage and privacy rules. |
| Operational controls | training lineage/parameters/datasets; audit event/application/log type; tool/agent identity; model registry/status; environment/application | Fields exist in part, but every control still needs an approved policy, evidence rule, and denominator. |

Normalize all durations to milliseconds before comparison. Component operations
may overlap, repeat, execute asynchronously, or be absent; never sum component
latencies as a decomposition of end-to-end time.

## Metrics endpoint: fields and aggregations

The aliases below are the aggregates Splunk provides to the API layer. The API
may map them to the existing Operations payload.

| Metric ID | Inputs | Aggregation / output aliases | Status condition |
| --- | --- | --- | --- |
| `end-to-end-latency-p95` | Eligible deduplicated `request_key`, `response_latency_ms` | `p95_latency_ms = P95(response_latency_ms)` | `OK` only after the request population, terminal outcomes, attribution, and percentile convention are approved. |
| `api-error-rate` | Canonical request outcome and approved API error rule | `error_request_count`; `eligible_request_count`; `error_rate_percent` | `OK` only after the outcome taxonomy and retry rule are approved; do not double-count status and error fields. |
| `pipeline-failure-rate` | One final pipeline record per `pipeline_run_key` | `failed_run_count`; `eligible_run_count`; `failure_rate_percent` | `OK` only after final states, retries/reruns, denominator, and attribution are approved. |
| `alert-feed` | No authorized alert-rule/threshold contract | No numeric aggregation | `CALCULATION_PENDING`; do not return an alert or incident count. |
| `uptime-sla` | No approved availability formula, service boundary, maintenance rule, or target | No numeric aggregation | `CALCULATION_PENDING`; never infer uptime from response status. |
| `cpu-memory` | No authorized fields | No numeric aggregation | `DATA_PENDING`. |
| `system-load` | No authorized fields | No numeric aggregation | `DATA_PENDING`. |
| `request-throughput` | Distinct `request_key` and approved time window | `request_count`; `window_seconds`; `throughput_requests_per_second` | `CALCULATION_PENDING` until the period-level roll-up and request/retry population are approved. |
| `pipeline-duration-average` | One eligible final run per `pipeline_run_key`, normalized duration | `run_count`; `average_duration_ms` | `OK` only after units, eligible states, rerun policy, timestamp, and attribution are approved. |
| `indexing-ai-services-latency-average` | Service-specific operation durations | No cross-service numeric aggregation yet | `CALCULATION_PENDING` until included services, weighting, grain, units, and attribution are approved. |
| `token-throughput` | Non-equivalent candidate token/search/trace rate fields | No numeric aggregation | `CALCULATION_PENDING`; do not substitute request throughput or token consumption. |
| `failure-rate-pipeline`, `failure-rate-activity`, `failure-rate-job`, `failure-rate-api`, `failure-rate-training`, `failure-rate-mlflow-span`, `failure-rate-indexing`, `failure-rate-transcription`, `failure-rate-translation` | Metric-specific operation key, terminal status, and eligibility | Per metric: `failed_count`; `eligible_count`; `failure_rate_percent` | Each result is independently `OK` only after its grain, status taxonomy, retry/partial-failure rule, timestamp, and attribution are approved. MLflow grain must be resolved first. |
| `training-reproducibility` | Candidate training/parameter/dataset/lineage fields | No numeric aggregation | `CALCULATION_PENDING`: reproducibility definition and eligible-run rule are missing. |
| `audit-logging` | Candidate audit events, application, operation, log type, timestamp | No numeric aggregation | `CALCULATION_PENDING`: mandatory event set and coverage formula are missing. |
| `tool-usage-compliance` | Candidate tool, agent, and version fields | No numeric aggregation | `CALCULATION_PENDING`: allowed-tool policy and denominator are missing. |
| `model-governance` | Candidate model identity, registry, status, and evaluation fields | No numeric aggregation | `CALCULATION_PENDING`: governed population and policy are missing. |
| `environment-compliance` | Candidate environment and application fields | No numeric aggregation | `CALCULATION_PENDING`: environment policy and exceptions are missing. |
| `safety-evaluation-score` | Foundry category evidence without an approved combined measure | No numeric aggregation | `CALCULATION_PENDING`. |
| `mlflow-safety-score` | Compatible `mlflow_safety_rating`, evaluation grain/version/population | `mlflow_safety_score = AVG(mlflow_safety_rating)`; `scale_max = 1` | `OK` only for the approved compatible `0–1` population, direction, weighting, and scope. |
| `pii-leakage-agent-only` | `sensitive_data_leakage` for confirmed agent workloads | No numeric aggregation yet | `DATA_PENDING`; never return `0%` or a no-leakage conclusion. |
| `upia` | UPIA evaluator outcomes; future test-case key and success taxonomy | No numeric aggregation yet | `CALCULATION_PENDING`; the UI label may remain `TEST RESULTS PENDING`. |

Each failure-surface rate has its own denominator and record grain. Return the
nine values as separate metric results or an equivalently status-bearing
grouped result. Never sum the rates, reuse a denominator across workloads, or
derive failure from a non-empty error message alone.

## Timeseries endpoint: fields and aggregations

### Service-path stability

For `chartId: "service-path-stability"`, return daily latency series in the
requested timezone:

```text
end-to-end-p95[day]  = P95(eligible request-level response_latency_ms)
model-response[day]  = AVG(eligible model_latency_ms)
retrieval[day]       = AVG(eligible query_latency_ms)
tool-call[day]       = AVG(eligible tool_call_latency_ms)
```

Return series IDs `end-to-end-p95`, `model-response-average`,
`retrieval-average`, and `tool-call-average`. Calculate P95 from individual
request values, not averages. Deduplicate every component at its approved
operation/span grain and return an independent status for every series.

## Explicit pending measures

Alert Feed, Uptime/SLA, CPU/Memory, System Load, Token Throughput, all five
Operational Control Coverage items, Safety Evaluation, PII Leakage, and UPIA
remain pending as described above. The single Indexing/AI Services average is
also pending until a valid service population and weighting rule are approved.
Static pending states do not need unrelated telemetry queries.

## Decisions required before `OK`

1. Canonical keys, terminal states, timestamps, retries/reruns, and eligibility for every workload.
2. Request/API error taxonomy, P95 convention, and handling of timeout, cancellation, and content filtering.
3. Component-latency operation grain, units, multiple-call roll-ups, and selected-filter attribution.
4. Throughput window and period roll-up; pipeline-duration units and eligible final states.
5. Per-workload failure rules, denominators, partial failures, minimum samples, and MLflow span grain.
6. Service boundary/formula for uptime and telemetry contracts for CPU, memory, load, and alerts.
7. Policies and denominators for reproducibility, audit, tool, model, and environment controls.
8. Safety aggregate, MLflow population/direction, agent-only leakage contract, and UPIA test taxonomy.

## Handoff checklist

- Every `OK` result has approved inputs, grain, eligibility, deduplication, denominator, timestamp, attribution, and units.
- Metrics and timeseries apply the same selected filters without claiming unsupported breakdowns.
- Component latencies remain non-additive and failure rates retain independent denominators.
- Pending, no-data, partial-coverage, and unsupported-filter states are returned explicitly.
- No response contains identifiers, raw text, errors, traces, safety reasons, or sensitive test evidence.
