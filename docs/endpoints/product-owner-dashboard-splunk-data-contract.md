# Product Owner Dashboard — Splunk Data Contract

## Purpose

This is the Splunk-facing data contract for the Product Owner main view. It
complements the shared endpoint strategy and endpoint examples:

- [Metrics endpoint](shared-dashboard-endpoints.md#1-single-metric-endpoint)
- [Timeseries endpoint](shared-dashboard-endpoints.md#2-timeseries-endpoint)

It specifies logical source fields and result aggregations, not final SPL or a
new public route. Splunk may map logical fields from indexed fields, calculated
fields, or approved lookups.

## Privacy, filtering, and status rules

Return only aggregates, time buckets, availability states, and approved
aggregate coverage. Do not return prompts, responses, feedback text,
identifiers, correlation IDs, evaluator reasons, raw errors, or security-test
content. Identifiers may be used inside Splunk for joins/deduplication only.

Apply time range, business unit, project, channel, and timezone before
aggregation. Use a metric event timestamp and the requested timezone for daily
buckets.

| Situation | Required result |
| --- | --- |
| Selected filter cannot be reliably attributed | FILTER_BREAKDOWN_UNAVAILABLE, with a reason |
| Valid definition but no eligible records | NO_DATA, not zero |
| Definition, key, denominator, or field semantics not approved | DATA_PENDING or CALCULATION_PENDING, with a reason |
| Coverage is requested | Approved aggregate eligible/included counts only; do not estimate a percentage |

Never present an unfiltered portfolio result as filtered, or use a proxy metric
for an unsupported value. Null, unknown, and unmapped channels must not become
Web, Teams, Mobile, or API.

## Required normalized source fields

| Population | Logical fields | Purpose / unresolved requirement |
| --- | --- | --- |
| User query and session | query_key, session_id, timestamp_start, channel_raw, channel_normalized, business_unit, project_name, eligibility marker | query_key must represent one submitted UI query. Confirm its canonical source, eligibility, deduplication, and retry rules; exclude tool/model calls, agent steps, and automatic retries. |
| Feedback | user_feedback_score, feedback_timestamp, feedback_key, application_name, attributable dimensions | Confirm score encoding: current evidence conflicts between binary 1/0 and a related >= 3 rule. Confirm timestamp, changed-feedback rule, grain, and selected-filter attribution. |
| Request latency | request_key, response_latency_ms, timestamp_start, timestamp_end, attributable dimensions | Confirm eligible request population, canonical request key, and selected-filter attribution. |
| Evaluations | evaluation_key, evaluation_timestamp, evaluator version/population, groundedness_score, relevance_score, intent_resolution_score, retrieval_score, task_adherence_score, attributable dimensions | evaluation_run_id and completion_id are candidates, not confirmed grain. Keep online, offline, and test/red-team populations separate. |
| MLflow safety | mlflow_safety_rating, evaluation key/timestamp/version/population, attributable dimensions | Normalize response/llm_judged/safety/rating/average. Documented scale is 0–1. |

Use one eligible, deduplicated user-query population for all query/session
totals, daily series, supporting ratios, and Channel Mix. Average only valid,
comparable evaluator scores from one approved version/population. Do not mix
MLflow 0–1 or F1-like values into the Product Owner 1–5 quality chart.

## Metrics endpoint: fields and aggregations

The aliases below are the aggregates Splunk provides to the API layer. The API
may map them to existing metric value objects.

| Metric ID | Inputs | Aggregation / output aliases | Status condition |
| --- | --- | --- | --- |
| session-query-volume | Eligible query_key, session_id, timestamp_start | query_count = COUNT(DISTINCT query_key); session_count = COUNT(DISTINCT session_id); queries_per_session = query_count / session_count | OK only after the query key and session population are approved. |
| user-satisfaction-rate | Valid user_feedback_score, feedback_timestamp, feedback_key | After binary-rule confirmation: positive_count, negative_count, positive_percent, negative_percent over valid feedback | CALCULATION_PENDING until score semantics, timestamp, grain, and changed-feedback rule are confirmed. |
| end-to-end-latency-p95 | Eligible deduplicated request_key, response_latency_ms | p95_latency_ms = P95(response_latency_ms) | OK only for valid request population and selected-scope attribution. |
| workflow-completion | No authorized fields | No numeric aggregation | DATA_PENDING: Completion event and formula not supplied. Do not substitute response_status, training_status, or approval_status. |
| safety-evaluators | Azure AI Foundry category score/result fields exist, but no approved aggregate | No numeric aggregation | CALCULATION_PENDING. Category evidence cannot become one Product Owner score. |
| mlflow-safety-score | Compatible mlflow_safety_rating, approved evaluation grain/version/population | mlflow_safety_score = AVG(mlflow_safety_rating); scale_max = 1 | OK only for the documented 0–1 population. |
| pii-leakage-agent-only | Sensitive_data_leakage exists, but type, direction, coverage, and agent-only population are unconfirmed | No numeric aggregation | DATA_PENDING; never return 0 percent or a no-leakage conclusion. |
| upia | indirect_attack, xpia_manipulated_content, xpia_intrusion, xpia_information_gathering; future contract also needs test_case_key and success taxonomy | No numeric aggregation yet | CALCULATION_PENDING: Test result contract not finalized. UI label can remain TEST RESULTS PENDING; current endpoint statuses have no separate code. |
| channel-mix-web, channel-mix-teams, channel-mix-mobile, channel-mix-api | Eligible query_key, normalized channel_normalized, timestamp_start | Per named channel: classified_query_count; all_classified_query_count; share_percent = classified_query_count / all_classified_query_count × 100 | OK only for classified eligible queries. Keep unknown/null/unmapped channels separate. |

Channel shares use the classified-query denominator after time scope and
approved filters. The effect of a non-all global channel filter on Channel Mix
is an open product-contract decision; SPL must not decide it implicitly.

## Timeseries endpoint: fields and aggregations

### Adoption and engagement

For chartId "adoption-and-engagement", return daily Sessions and Queries from
the eligible, deduplicated user-query population in the requested timezone:

    sessions[day] = COUNT(DISTINCT session_id)
    queries[day]  = COUNT(DISTINCT query_key)
    queries_per_session = total_query_count / total_session_count
    session_duration_minutes(session) =
      (MAX(timestamp_start) - MIN(timestamp_start)) / 60 seconds
    avg_session_duration_minutes = AVG(session_duration_minutes)

Sessions and Queries are series. Queries per session and average session
duration are supporting stats only when their keys, session rules, and time
rules are usable. A one-query session is zero observed span unless an approved
session-end or inactivity rule exists.

### Experience and response quality

The main view needs a second chart family absent from the current endpoint
request example: chartId "experience-and-response-quality".

| Series or supporting stat | Inputs | Result |
| --- | --- | --- |
| groundedness | Valid compatible groundedness_score, evaluation key/timestamp | AVG(groundedness_score) per day |
| relevance-quality | Valid compatible relevance_score, evaluation key/timestamp | AVG(relevance_score) per day |
| intent-resolution | Valid compatible intent_resolution_score, evaluation key/timestamp | AVG(intent_resolution_score) per day, only after 1–5 scale/direction confirmation |
| retrieval-quality | Valid compatible retrieval_score, evaluation key/timestamp | Supporting stat: AVG(retrieval_score), 1–5 scale |
| task-adherence | Valid compatible task_adherence_score, evaluation key/timestamp | Supporting stat: AVG(task_adherence_score), 1–5 scale |

Deduplicate at the approved evaluation/request/completion grain before each
daily average. Do not average daily averages with unequal populations or create
a composite quality score.

## Explicit pending measures

Feature Usage has no feature identifier, event taxonomy, exposure/eligibility
definition, event key, or approved formula. Return DATA_PENDING, never a
session/query-volume proxy. Workflow Completion, Safety Evaluators, PII Leakage,
and UPIA use the status treatment in the metrics table. Static pending states
do not need unrelated telemetry queries.

## Decisions required before OK

1. Submitted-query key plus eligibility/retry rules.
2. Session end, idle-gap, cross-day, and conversation-to-session rules.
3. Feedback encoding, timestamp, changed-feedback rule, and privacy-preserving
   request/response correlation.
4. Eligible request population and P95 convention.
5. Channel vocabulary and non-all channel-filter behaviour.
6. Per-metric business-unit/project/channel attribution and approved joins.
7. Evaluation grain, evaluator version/population, and Intent Resolution scale/direction.
8. MLflow rating direction/coverage, plus future definitions for feature usage,
   workflow completion, Safety Evaluator aggregation, PII Leakage, and UPIA.

## Handoff checklist

- Each OK metric has documented inputs, eligibility, deduplication, and a
