# Executive Dashboard — Splunk Data Contract

## Purpose

This is the Splunk-facing data contract for the Executive main view. It
complements the shared endpoint strategy and endpoint examples:

- [Metrics endpoint](shared-dashboard-endpoints.md#1-single-metric-endpoint)
- [Timeseries endpoint](shared-dashboard-endpoints.md#2-timeseries-endpoint)

It specifies logical source fields and result aggregations, not final SPL or a
new persona-specific route. Splunk may map logical fields from indexed fields,
calculated fields, or approved lookups.

Requests use `dashboard: "executive"` and the section IDs `executive-pulse`,
`session-and-query-volume`, `cost-by-business-unit`, and `safety-and-risk`.

## Privacy, filtering, and status rules

Return only aggregates, time buckets, availability states, and approved
aggregate coverage. Do not return prompts, responses, feedback text, user or
request identifiers, raw errors, evaluator reasons, sensitive values, or
security-event content. Identifiers may be used inside Splunk for correlation
and deduplication only.

Apply time range, business unit, project, channel, authorization scope, and
timezone before aggregation. Use the approved event timestamp and requested
timezone for time buckets.

| Situation | Required result |
| --- | --- |
| Selected filter cannot be reliably attributed | `FILTER_BREAKDOWN_UNAVAILABLE`, with a reason |
| Valid definition but no eligible records | `NO_DATA`, not zero |
| Definition, scale, key, denominator, pricing, or field semantics not approved | `DATA_PENDING` or `CALCULATION_PENDING`, with a reason |
| Coverage is requested | Approved aggregate eligible/included counts only; do not estimate a percentage |

Never present an unfiltered portfolio result as filtered. Never treat missing
latency, cost, feedback, or evaluator data as zero, successful, safe, or free.

## Required normalized source fields

| Population | Logical fields | Purpose / unresolved requirement |
| --- | --- | --- |
| User request and session | `request_key`, `session_id`, `timestamp_start`, `timestamp_end`, `response_latency_ms`, `response_status`, `status_code`, `error_code`, attributable dimensions, eligibility marker | Confirm the canonical user-request key, terminal outcome, retries, and whether one request represents one submitted query. |
| Feedback | `feedback_key`, `user_feedback_score`, `feedback_timestamp`, `request_key`, attributable dimensions | Confirm binary versus rating-scale encoding, effective feedback record, timestamp, and privacy-preserving request attribution. |
| Model-call cost | `model_call_key`, `request_key`, `prompt_tokens`, `completion_tokens`, `cached_tokens`, `model_name`, `model_version`, `deployment_name`, `currency_code`, price version/effective time | Confirm billing rules, pricing source and unit, retry/cached-token treatment, and one currency or approved conversion. |
| Cost ownership | `request_key`, `business_unit`, `project_name`, attribution timestamp/status | Confirm the authoritative business-unit level, one-owner rule, shared-cost allocation, unattributed treatment, and representative-project rule. |
| Foundry safety evaluation | `evaluation_key`, `request_key`, evaluation timestamp/version/population, category score/result fields for hate/unfairness, violence, sexual content, and self-harm, attributable dimensions | Confirm complete-evaluation rule, request grain, included categories, result taxonomy, and whether an impacted-request rate is the approved Executive measure. |
| MLflow safety | `mlflow_safety_rating`, evaluation key/timestamp/version/population, model key, attributable dimensions | Resolve the documented `0–1` field versus the conflicting five-point example and confirm direction and weighting. |
| Agent-only leakage evaluation | `sensitive_data_leakage`, evaluation/request key, agent eligibility, timestamp/version/population, attributable dimensions | Confirm availability, type, encoding, direction, coverage, and agent-only population. |

Use one eligible, deduplicated user-request population wherever request totals
must reconcile. Aggregate model calls to the approved user-request grain before
calculating request cost. Keep online, offline, test, and red-team evaluation
populations separate unless explicitly approved.

## Metrics endpoint: fields and aggregations

The aliases below are the aggregates Splunk provides to the API layer. The API
may map them to the existing Executive payload.

| Metric ID | Inputs | Aggregation / output aliases | Status condition |
| --- | --- | --- | --- |
| `end-to-end-latency-p95` | Eligible deduplicated `request_key`, `response_latency_ms` | `p95_latency_ms = P95(response_latency_ms)` | `OK` only after request population, terminal outcomes, attribution, and percentile convention are approved. |
| `api-error-rate` | Canonical request outcome and approved error rule | `error_request_count`; `eligible_request_count`; `error_rate_percent = error_request_count / eligible_request_count * 100` | `OK` only after the outcome taxonomy and retry rule are approved; do not add status/error fields as separate failures. |
| `session-query-volume` | Eligible `request_key`, `session_id`, `timestamp_start` | `query_count`; `session_count`; `queries_per_session`; `avg_session_duration_minutes` | `OK` only after request, session, cross-day, idle-gap, and one-query-session rules are approved. |
| `user-feedback` | Valid effective feedback records | `positive_count`; `negative_count`; `positive_percent`; `negative_percent` | `CALCULATION_PENDING` until score encoding, feedback grain, change rule, timestamp, and attribution are approved. |
| `cost-per-request` | Deduplicated priced model calls grouped by `request_key` | `total_request_cost`; `request_count`; `average_cost_per_request`; `currency_code` | `OK` only after pricing, billed-call population, cached/retry treatment, currency, request key, and attribution are approved. |
| `cost-by-business-unit-project` | Eligible `request_key`, request cost, approved ownership | Per business unit: `business_unit_cost`; `representative_project_name`; `representative_project_cost`; optional `unattributed_cost`; `currency_code` | `OK` only after ownership and representative-project rules are approved. Project cost must be a subset of its business-unit total. |
| `infrastructure-cost` | No authorized fields | No numeric aggregation | `DATA_PENDING`; never infer it from AI token cost or include it in allocation totals. |
| `safety-evaluation-score` | Compatible complete Foundry category results at request grain | No numeric aggregation yet | `CALCULATION_PENDING` until the Executive measure, included categories, completeness, and impacted-request rule are approved. |
| `mlflow-safety-score` | Compatible `mlflow_safety_rating` records | No numeric aggregation yet | `CALCULATION_PENDING` until the scale conflict, direction, grain, evaluator version/population, and weighting are resolved. |
| `pii-leakage-agent-only` | `sensitive_data_leakage` for confirmed agent workloads | No numeric aggregation yet | `DATA_PENDING`; never return `0%`, a no-leakage conclusion, or a breach conclusion. |

The grouped cost metric is a compact categorical result and therefore belongs
to the metrics endpoint, not the timeseries endpoint. Do not duplicate a
request's full cost across multiple owners. Keep missing/conflicting ownership
explicit rather than silently excluding it.

## Timeseries endpoint: fields and aggregations

### Session and query volume

For `chartId: "session-and-query-volume"`, return daily Sessions and Queries
from the same eligible, deduplicated user-request population used by the summary
metric:

```text
sessions[day] = COUNT(DISTINCT session_id active in day)
queries[day]  = COUNT(DISTINCT request_key assigned to day)
queries_per_session = period_query_count / period_session_count
session_duration_minutes(session) =
  (MAX(timestamp_start) - MIN(timestamp_start)) / 60 seconds
avg_session_duration_minutes = AVG(session_duration_minutes)
```

Sessions and Queries are series. Queries per session and average session
duration are period-level supporting stats, not averages or sums of daily
points. A session may appear in more than one daily bucket, so daily session
counts must not be summed to reproduce the period distinct-session count.

## Explicit pending measures

Infrastructure Cost has no approved source. Safety Evaluation has category
evidence but no approved Executive aggregate. MLflow Safety has conflicting
scale evidence. PII Leakage lacks an approved type, encoding, and supported
population. Return the status in the metrics table; static pending states do not
need unrelated telemetry queries.

## Decisions required before `OK`

1. Canonical request/query key, terminal outcome, eligibility, and retry rules.
2. Session end, idle-gap, cross-day, and one-query-session duration rules.
3. Feedback scale, effective-record rule, timestamp, and selected-filter attribution.
4. P95 convention, included outcomes, minimum sample, and display precision.
5. Cost pricing source/version/unit, currency, cached tokens, retries, and model-call-to-request correlation.
6. Business-unit hierarchy, project ownership, shared/unattributed cost treatment, and representative-project selection.
7. Per-population time and business-unit/project/channel attribution rules.
8. Foundry safety aggregate, MLflow scale/direction/weighting, and agent-only leakage availability and encoding.

## Handoff checklist

- Every `OK` result has approved inputs, eligibility, deduplication, denominator, timestamp, attribution, and units.
- Metrics and timeseries use the same selected filters and compatible population definitions.
- Cost totals reconcile without double allocation, and project values never exceed their business-unit totals.
- Pending, no-data, partial-coverage, and unsupported-filter states are returned explicitly.
- No response contains identifiers, raw text, raw errors, evaluator reasons, or sensitive evidence.
