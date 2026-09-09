# Tech Team Dashboard — Splunk Data Contract

## Purpose

This is the Splunk-facing data contract for the Technical Teams main view. It
complements the shared endpoint strategy and endpoint examples:

- [Metrics endpoint](shared-dashboard-endpoints.md#1-single-metric-endpoint)
- [Timeseries endpoint](shared-dashboard-endpoints.md#2-timeseries-endpoint)

It specifies logical source fields and result aggregations, not final SPL or a
new persona-specific route. Splunk may map logical fields from indexed fields,
calculated fields, or approved lookups.

Requests use `dashboard: "tech-team"` and the section IDs
`request-path-health`, `failure-localization`, `capacity-and-efficiency`,
`ai-model-quality`, and `evaluator-readiness`.

## Privacy, filtering, and status rules

Return only aggregates, time buckets, availability states, and approved
aggregate coverage. Do not return prompts, responses, identifiers, correlation
IDs, raw errors, stack traces, evaluator reasons, sensitive values, or
attack-test content. Identifiers may be used inside Splunk for correlation and
deduplication only.

Apply time range, business unit, project, channel, authorization scope, and
timezone before aggregation. Each source population uses its approved event
timestamp and operation key.

| Situation | Required result |
| --- | --- |
| Selected filter cannot be reliably attributed | `FILTER_BREAKDOWN_UNAVAILABLE`, with a reason |
| Valid definition but no eligible records | `NO_DATA`, not zero |
| Definition, key, denominator, status taxonomy, scale, pricing, or field semantics not approved | `DATA_PENDING` or `CALCULATION_PENDING`, with a reason |
| Coverage is requested | Approved aggregate eligible/included counts only; do not estimate a percentage |

Never present an unfiltered portfolio result as filtered. Do not interpret
missing telemetry or evaluations as zero latency, zero failures, zero cost,
unused capacity, low quality, safe content, or no leakage.

The shared endpoint status vocabulary does not contain `DEFINITION_PENDING`,
`FORMULA_PENDING`, or `TEST_RESULTS_PENDING`. Return `CALCULATION_PENDING` with
a precise reason; the API/UI may map that reason to the more specific display
label.

## Required normalized source fields

| Population | Logical fields | Purpose / unresolved requirement |
| --- | --- | --- |
| User/API request | `request_key`, request timestamps, `response_latency_ms`, terminal response status, HTTP status, API error code, attributable dimensions, eligibility marker | Confirm one terminal user-request outcome, retries, P95 convention, and API-service error taxonomy. |
| Model calls | `model_call_key`, `request_key`, timestamp, `model_latency_ms`, terminal status, HTTP/model error code, model/deployment/version, attributable dimensions | Confirm whether Inference Error Rate uses model-call attempts or final user requests and how retries roll up. |
| Retrieval and tool operations | operation/span key, `request_key`, timestamp, `query_latency_ms`, `tool_call_latency_ms`, result/status/type, attributable dimensions | Confirm eligible operations, units, multiple-call roll-ups, and correlation. |
| Pipeline, job, and training runs | metric-specific run key, timestamps/duration, final status, failure type/code, retry lineage, attributable dimensions | Confirm final-state taxonomies, denominators, and retry/rerun behavior. |
| Indexing, transcription, and translation operations | operation key/type, timestamps/duration, final status, failed-document count where applicable, attributable dimensions | Confirm partial-failure treatment, comparable units, and selected-filter attribution. |
| Model-call tokens and cost | `model_call_key`, `request_key`, prompt/input tokens, completion/output tokens, total token transaction, cached tokens, model/deployment/version, currency, price version/effective time | Confirm authoritative token fields, pricing, billed-call population, retries/caching, and model-call-to-request correlation. |
| Foundry quality evaluations | `evaluation_key`, completion/request key, evaluation timestamp/version/population, `groundedness_score`, `coherence_score`, `relevance_score`, `retrieval_score`, corresponding result fields, attributable dimensions | Confirm `1–5` compatibility, grain, repeated-evaluation rule, coverage, and online/offline population. |
| MLflow quality and safety | evaluation/request/model key, timestamp/version/population, `mlflow_correctness_rating`, `mlflow_safety_rating`, attributable dimensions | Preserve the documented `0–1` scales and keep them separate from Foundry `1–5` scores. |
| Agent-only leakage and UPIA tests | evaluation/test-case key, request/model key, timestamp/version/population, `sensitive_data_leakage`, UPIA result fields, agent/test eligibility, attributable dimensions | Confirm field encoding, supported agents, test-case success taxonomy, coverage, and confidentiality. |

Normalize all durations to milliseconds before comparison. Model, retrieval, and
tool operations may overlap or repeat, so they are not additive components of
end-to-end latency. Keep online, offline, agent-only, and security-test
populations separate unless explicitly approved.

## Metrics endpoint: fields and aggregations

The aliases below are the aggregates Splunk provides to the API layer. The API
may map them to the existing Technical Teams payload.

| Metric ID | Inputs | Aggregation / output aliases | Status condition |
| --- | --- | --- | --- |
| `request-throughput` | Distinct `request_key` and approved time window | `request_count`; `window_seconds`; `throughput_requests_per_second` | `CALCULATION_PENDING` until the period-level roll-up and request/retry population are approved. |
| `inference-error-rate` | One canonical model-call or request outcome and approved error rule | `error_count`; `eligible_count`; `error_rate_percent` | `OK` only after grain, status taxonomy, retries, timestamp, and attribution are approved; do not double-count status/error fields. |
| `pipeline-duration-average` | One eligible final pipeline run and normalized duration | `run_count`; `average_duration_ms` | `OK` only after units, eligible states, rerun policy, timestamp, and attribution are approved. |
| `indexing-ai-services-latency-average` | Service-specific operation durations | No cross-service numeric aggregation yet | `CALCULATION_PENDING` until included services, weighting, grain, units, and attribution are approved. |
| `failure-rate-pipeline`, `failure-rate-job`, `failure-rate-inference`, `failure-rate-api-service`, `failure-rate-training`, `failure-rate-indexing`, `failure-rate-transcription`, `failure-rate-translation` | Metric-specific operation key, final status, and eligibility | Per metric: `failed_count`; `eligible_count`; `failure_rate_percent` | Each result is independently `OK` only after its grain, status taxonomy, retry/partial-failure rule, timestamp, and attribution are approved. |
| `cost-per-request` | Deduplicated priced model calls grouped by `request_key` | `total_request_cost`; `request_count`; `average_cost_per_request`; `currency_code` | `OK` only after pricing, billed-call population, cached/retry treatment, currency, request key, and attribution are approved. |
| `token-usage-per-request` | Valid deduplicated token records grouped by `request_key` | `total_tokens`; `request_count`; `average_tokens_per_request` | `OK` only after authoritative token fields, multi-call roll-up, caching/retry population, and attribution are approved. |
| `token-throughput` | Non-equivalent token/search/trace rate candidates | No numeric aggregation | `CALCULATION_PENDING`; do not substitute token usage or request throughput. |
| `available-token-limit` | `active_tokens` without an authoritative compatible limit | No numeric aggregation | `CALCULATION_PENDING`; tokens in flight are not remaining capacity. |
| `cache-hit-ratio` | Platform cache-match rate or cached-token ratio candidates | No numeric aggregation | `CALCULATION_PENDING` until one formula, unit, population, and grouping rule are approved. |
| `safety-evaluation-score` | Foundry category evidence without an approved combined measure | No numeric aggregation | `CALCULATION_PENDING`. |
| `mlflow-safety-score` | Compatible `mlflow_safety_rating`, evaluation grain/version/population | `mlflow_safety_score = AVG(mlflow_safety_rating)`; `scale_max = 1` | `OK` only for the approved compatible population, direction, weighting, and scope. |
| `pii-leakage-agent-only` | `sensitive_data_leakage` for confirmed agent workloads | No numeric aggregation yet | `DATA_PENDING`; never return `0%` or a no-leakage conclusion. |
| `upia` | UPIA evaluator outcomes; future test-case key and success taxonomy | No numeric aggregation yet | `CALCULATION_PENDING`; the UI label may remain `TEST RESULTS PENDING`. |

Each Failure Localization value has its own denominator and record grain.
Return the eight values as separate metric results or an equivalently
status-bearing grouped result. Never sum the rates or reuse a denominator across
workloads.

## Timeseries endpoint: fields and aggregations

Call the timeseries endpoint once per chart family.

### Request-path health

For `chartId: "request-path-health"`, return daily latency series in the
requested timezone:

```text
end-to-end-p95[day] = P95(eligible request-level response_latency_ms)
model-response[day] = AVG(eligible model_latency_ms)
retrieval[day]      = AVG(eligible query_latency_ms)
tool-call[day]      = AVG(eligible tool_call_latency_ms)
```

Return series IDs `end-to-end-p95`, `model-response-average`,
`retrieval-average`, and `tool-call-average`. Calculate P95 from individual
request values and deduplicate every component at its approved operation/span
grain. Return an independent status for every series.

### AI and model quality

For `chartId: "ai-model-quality"`, return daily compatible Foundry evaluation
series plus period-level supporting stats:

```text
groundedness[day]      = AVG(valid groundedness_score)
response-coherence[day] = AVG(valid coherence_score)
relevance-quality[day] = AVG(valid relevance_score)
retrieval-quality      = AVG(valid retrieval_score)
mlflow-correctness     = AVG(valid mlflow_correctness_rating)
```

Groundedness, Response Coherence, and Relevance Quality share the chart only
when all are compatible `1–5` scores from the approved evaluator population.
Retrieval Quality is a period-level `1–5` supporting stat. MLflow Correctness is
a separate `0–1` supporting stat and must not be transformed onto or averaged
with the `1–5` series. Deduplicate at the approved evaluation/request/completion
grain; do not average daily averages with unequal populations.

## Explicit pending measures

Token Throughput has no selected source/definition. Available Token Limit
confuses tokens in flight with capacity. Cache Hit Ratio has competing formulas.
The cross-service Indexing/AI Services average lacks a valid combined population
and weighting rule. Safety Evaluation, PII Leakage, and UPIA remain pending as
described above. Static pending states do not need unrelated telemetry queries.

## Decisions required before `OK`

1. Canonical request, model-call, operation, run, and evaluation keys plus retry/deduplication rules.
2. P95 convention, terminal outcomes, component-latency roll-ups, units, timestamps, and time buckets.
3. Throughput window/period roll-up and inference/API-service error taxonomies.
4. Per-workload failure denominators, partial failures, retries, minimum samples, and selected-filter attribution.
5. Token source/grain, multi-call request roll-up, pricing, currency, cached-token and failed/retried-call treatment.
6. Token-throughput definition, authoritative capacity limit, and cache-hit formula.
7. Quality evaluator versions/populations, score scales/direction, evaluation grain, weighting, coverage, and attribution.
8. Safety aggregate, MLflow safety population/direction, agent-only leakage contract, and UPIA test taxonomy.

## Handoff checklist

- Every `OK` result has approved inputs, grain, eligibility, deduplication, denominator, timestamp, attribution, units, and scale.
- Metrics and both timeseries chart families apply the same selected filters without claiming unsupported breakdowns.
- Component latencies remain non-additive; failure rates retain independent denominators; incompatible score scales remain separate.
- Pending, no-data, partial-coverage, and unsupported-filter states are returned explicitly.
- No response contains identifiers, raw text, errors, traces, evaluator reasons, or sensitive test evidence.
