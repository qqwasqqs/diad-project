# Technical Teams Dashboard Main-View Development Tasks

## Scope and delivery boundary

Build the main-view content shown in the approved Technical Teams dashboard
alternative. The existing boilerplate already provides the title, top filters,
and header; the left navigation is out of scope. Tasks 1-6 cover the main
view; the approved detail drawers are separately scoped in Tasks 7-12.

Every number and chart trajectory in the concept is illustrative. Apply the
selected time, business-unit, project, and channel filters before each metric's
aggregation, but only where approved attribution exists. Otherwise display
`FILTER BREAKDOWN UNAVAILABLE` or `DATA PENDING`; never render a portfolio-wide
value as if it were filtered, or use zero as a substitute for unavailable data.

The dashboard consumes already normalized, correlated, deduplicated, filtered,
and aggregated observability results from Splunk or an approved API. These
tasks do not define endpoints, query contracts, thresholds, or raw-telemetry
access.

## Task 1: Build Request-path health latency chart

Implement the left side of the Request-path health section as a 30-day,
millisecond-based four-series trend: End-to-End P95, Model Response average,
Retrieval average, and Tool Call average. Use P95 only for eligible
request-level end-to-end durations; calculate the other series as averages of
their valid, deduplicated operations:

```text
end_to_end_point = P95(eligible response_latency_ms in bucket)
model_point      = AVG(eligible model_latency_ms in bucket)
retrieval_point  = AVG(eligible query_latency_ms in bucket)
tool_point       = AVG(eligible tool_call_latency in bucket)
```

Use one approved, timezone-defined time bucket and one millisecond axis for all
series. The chart must state that component times are not additive: they can
overlap, be absent, or occur asynchronously, so they are not an end-to-end
latency decomposition. Do not calculate P95 from pre-aggregated averages. A
request with multiple component calls requires an approved request-level
roll-up before comparison.

## Task 2: Build Request-path health diagnostic list

Implement the right side of the Request-path health section as four distinct
diagnostic values: Request Throughput, Inference Error Rate, Pipeline Duration
average, and Indexing / AI Services average. Keep each value independently
calculated and clearly labeled; these are diagnostic context, not additive
request-path components or threshold statuses.

Use these calculation shapes once their population and contract are confirmed:

```text
throughput_req_s = COUNT(DISTINCT request_id) / window_seconds
inference_error_rate = COUNT(DISTINCT eligible_key WHERE approved_error_flag) /
                       COUNT(DISTINCT eligible_key) * 100
pipeline_duration = AVG(valid final pipeline-run duration)
```

The Request Throughput headline needs an approved period summary (elapsed-period
rate, fixed-bucket average, or latest rate). Inference Error Rate needs one
normalized terminal error rule and a confirmed request-versus-model-call
denominator. Pipeline Duration is an asynchronous pipeline-run indicator, not
an End-to-End Latency component. Do not show a single Indexing / AI Services
average until its approved service population, operation grain, and weighting
rule are supplied; otherwise show `DATA PENDING` or a service-specific value.

## Task 3: Build Failure localization

Implement the eight workload-specific failure-rate bars for Pipeline, Job,
Inference, API Service, Training, Indexing, Transcription, and Translation.
Each bar represents a distinct workload rate with its own terminal record key,
failure rule, and eligible denominator:

```text
failure_rate_pct(metric) =
  COUNT(DISTINCT approved_unit WHERE approved_failure_rule) /
  COUNT(DISTINCT eligible approved_unit) * 100
```

Use final execution/call records and deduplicate retries or retransmissions.
Do not sum the rates, compare their raw failure counts by bar length, or apply
one shared denominator across services. The implementation must wait for
source-specific classification rules for timeouts, cancellations, partial
failures, and non-success states; in particular, indexing needs an explicit
decision for `failed_document_count` and partial indexing failures.

## Task 4: Build Capacity and efficiency

Implement the Capacity and efficiency rows for Cost per Request, Token Usage /
Request, Token Throughput, Available Token Limit, and Cache Hit Ratio.

For live supported values, calculate one request total before period averaging:

```text
request_cost = SUM(included model_call_cost for request_key)
average_cost = SUM(request_cost) / COUNT(DISTINCT request_key)

request_tokens = SUM(TokenTransaction for approved request_key)
average_tokens = SUM(request_tokens) / COUNT(DISTINCT request_key)
```

Cost must use approved pricing, deployment, currency, effective-date, and
cached-token rules; token usage must not mix incompatible Azure-platform and
MLflow token sources. Keep Token Throughput and Available Token Limit as
`DEFINITION PENDING`, and Cache Hit Ratio as `FORMULA PENDING`. Do not infer
remaining capacity from `ActiveTokens`, treat a pending cache ratio as `0%`, or
choose between the documented non-equivalent cache alternatives.

## Task 5: Build AI and model quality

Implement the 30-day quality trend with the compatible 1-5 Groundedness,
Response Coherence, and Relevance Quality evaluator series. For each series,
aggregate valid evaluator scores at the approved record grain before display:

```text
score_point(metric, bucket) = AVG(valid metric_score in bucket)
```

Use one approved evaluator/version and population, deduplicate repeated
evaluations by the approved completion/request/evaluation key, and exclude
missing or invalid scores rather than treating them as low scores. Do not
average unequal daily averages, combine online and offline/test populations
without approval, or plot `0-1` MLflow scores on this axis.

Add the two separate supporting values: Retrieval Quality as
`AVG(valid retrieval_score)`, displayed on the documented 1-5 scale, and
MLflow Correctness as `AVG(valid correctness_rating)`, displayed on its 0-1
scale. Keep them separate from each other and from the chart; do not create a
composite score or convert MLflow Correctness to `/5`.

## Task 6: Build Evaluator readiness and security tests

Implement the four-row evaluator-readiness panel: Safety Evaluation Score,
MLflow Safety Score, PII Leakage (Agent Only), and UPIA. This section reports
whether evaluator/test evidence is usable; it is not an incident, risk-posture,
or release-decision summary.

Calculate MLflow Safety Score only as an approved-population average of valid
0-1 ratings, rounded for display:

```text
safety_score = AVG(valid MLflow safety ratings)
display      = round(safety_score, 2) + " / 1"
```

Keep Safety Evaluation Score as `CALCULATION PENDING` because no aggregate
definition is approved. Keep PII Leakage (Agent Only) as `DATA PENDING` until
the evaluator encoding, agent coverage, and eligible request/evaluation key
are confirmed. Keep UPIA as `TEST RESULTS PENDING` until the successful-attack
rule, test-case key, eligible test population, and test-run provenance are
approved. Do not show raw prompts, responses, evaluator reasons, PII values,
attack content, test cases, or security-operation diagnostics.

## Detail-view drawer tasks

Each selected element opens its approved compact, non-scrolling right-side
drawer over the dimmed Technical Teams main view. Preserve the active time,
business-unit, project, and channel context. A drawer adds calculation
provenance, scale clarity, or readiness context; it must not become a new page
or a duplicate of an unrelated main-view element. Do not expose raw prompts,
responses, identifiers, traces, tool arguments/results, raw errors, sensitive
values, or model/deployment filters.

## Task 7: Build the AI and model quality drawer

Implement the AI and model quality drawer with the three compatible 1-5
evaluator series—Groundedness, Response Coherence, and Relevance Quality—plus
separate cards for Retrieval Quality (`4.0 / 5`) and MLflow Correctness
(`0.88 / 1`). Include a calculation-context table that makes the average
calculation and each scale visible, and display `EVALUATOR COVERAGE PENDING`.

Keep the Foundry 1-5 measures and the MLflow 0-1 measure visibly separate;
never normalize them into a single scale or composite score. Do not add a
Hallucination percentage, raw evaluation/retrieval content, pass/fail
thresholds, user data, recommendations, training metrics, or a design for the
future `View all quality evaluations` action.

## Task 8: Build the Capacity and efficiency drawer

Implement the Capacity and efficiency drawer with distinct illustrative cards
for Cost per Request (`$0.12`) and Token Usage / Request (`2.4K tokens`), a
request-level calculation-context panel, and a definition register. The
context must describe average included token cost per request and average total
tokens per request without adding unapproved trends, budgets, or targets.

The definition register must retain Token Throughput and Available Token Limit
as `DEFINITION PENDING`, and Cache Hit Ratio as `FORMULA PENDING`. Include the
pending global-filter-attribution and cost/token-coverage state. Do not show
total cost, ROI, quota, capacity utilization, a cache percentage, real pricing,
or model/deployment details.

## Task 9: Build the Evaluator readiness and security tests drawer

Implement the evaluator-readiness drawer as a provenance and availability
view. Show the four-row readiness matrix: Safety Evaluation Score
`CALCULATION PENDING`, MLflow Safety Score `0.91 / 1`, PII Leakage (Agent Only)
`DATA PENDING`, and UPIA `TEST RESULTS PENDING`.

Add the MLflow Safety context—`AVG(Safety)` on a 0-1 scale—and a decisions
register explaining the pending safety aggregation, agent-only PII telemetry,
and UPIA test evidence. Show `EVALUATOR COVERAGE PENDING` so the illustrative
MLflow value is not interpreted as complete risk evidence. This drawer is not
an incident, breach, attack, or security-operations view; exclude evaluator
reasons, sensitive values, prompts, payloads, thresholds, remediation, and
workflow controls.

## Task 10: Build the Failure localization drawer

Implement the Failure localization drawer as a comparison of the eight
workload-specific illustrative failure rates: Pipeline, Job, Inference, API
Service, Training, Indexing, Transcription, and Translation. Add a compact
calculation/provenance table with each workload's `Failure / eligible unit`
shape and a `PENDING` filter-coverage state. Include only safe source-status
context, such as terminal-status classifications.

Preserve `FAILURE CLASSIFICATION PENDING` and `INDEXING PARTIAL-FAILURE RULE
PENDING`. The drawer supports rate provenance, not root-cause analysis: do not
show raw errors, stack traces, request IDs, counts, incident/remediation
controls, a combined failure rate, thresholds, or unsupported cause claims.

## Task 11: Build the Request-path diagnostics list drawer

Implement the Request-path diagnostics drawer for the four right-side
main-view diagnostics only: Request Throughput (`42.8 req/s`), Inference Error
Rate (`1.14%`), Pipeline Duration average (`42 s`), and Indexing / AI Services
average (`620 ms`). Add a metric-context table that states each metric's
calculation type, source context, and `PENDING` filter coverage without
combining incompatible units on one chart.

State explicitly that asynchronous Pipeline and Indexing / AI Services timing
is not added to request-path latency, and retain `CROSS-SERVICE AGGREGATION
PENDING` for Indexing / AI Services. Exclude the four-series latency chart,
raw errors, request IDs, traces, model/deployment filters, thresholds, and
recommendations.

## Task 12: Build the Request-path latency chart drawer

Implement the Request-path latency drawer for the four-series latency chart
only: End-to-End P95, Model Response average, Retrieval average, and Tool Call
average. Include four compact latest-value cards, an enlarged 30-day trend on a
millisecond axis, a metric table that makes P95 versus average calculations
explicit, and visible `PENDING` filter-coverage states.

Retain the `Component times are not additive` note and the pending time-bucket,
timezone, and attribution notice. Do not include Request Throughput, Inference
Error Rate, Pipeline Duration, Indexing / AI Services, tool-by-tool or
completion-status breakdowns, raw traces, identifiers, or recommendations.
