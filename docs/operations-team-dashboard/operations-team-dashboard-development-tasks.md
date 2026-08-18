# Operations Team Dashboard Main-View Development Tasks

## Scope and delivery boundary

Build the Operations Team dashboard content shown in the approved revised
concept. The existing boilerplate already provides the title, top filters, and
header. Tasks 1-7 cover the main view; the approved detail drawers are
separately scoped in Tasks 8-14.

All concept values, chart trajectories, and color cues are illustrative. Apply
the selected time, business-unit, project, and channel scope before each
supported metric's aggregation only where the data is reliably attributable.
Otherwise display `FILTER BREAKDOWN UNAVAILABLE` or `DATA PENDING`; never show
an unfiltered value as if it were scoped or substitute zero for missing data.

The dashboard renders normalized, correlated, deduplicated, filtered, and
aggregated observability results returned by Splunk or an approved API. These
tasks do not define API endpoints, query contracts, threshold rules, or raw
telemetry access.

## Task 1: Add Operational situation

Reuse the existing shared Operational situation components in the dashboard
content area. This section presents the approved End-to-End Latency, API Error
Rate, Pipeline Failure Rate, and Alert feed states. Do not rebuild the shared
components or add calculation logic as part of this task.

## Task 2: Build Requested operations coverage

Implement the compact Requested operations coverage section as three explicit
availability states: Uptime / SLA `DEFINITION PENDING`, CPU / Memory `DATA
PENDING`, and System load `DATA PENDING`. These are Operations requirements,
not valid zero values or live health indicators.

Do not infer an uptime percentage from `response_status`, create an SLA target,
calculate CPU/memory/load values, or display alert/incident counts. Live
reporting requires an approved uptime/SLA formula and service boundary, plus
CPU, memory, system-load, alert-event, severity, ownership, acknowledgement,
and resolution contracts.

## Task 3: Build Service-path stability chart

Implement the left side of Service-path stability as a 30-day four-series,
millisecond trend: End-to-End P95, Model Response average, Retrieval average,
and Tool Call average.

```text
end_to_end_point = P95(eligible response_latency_ms in bucket)
model_point      = AVG(eligible model_latency_ms in bucket)
retrieval_point  = AVG(eligible query_latency_ms in bucket)
tool_point       = AVG(eligible tool_call_latency in bucket)
```

Use P95 only for request-level End-to-End Latency and averages for the three
component series. Calculate P95 from eligible individual requests, not from
averages, and use one approved timezone-defined bucket boundary and one
millisecond axis. Display `Component times are not additive`: components can
overlap, repeat, run asynchronously, or be absent, so the lines are not a
decomposition of end-to-end time. Multiple component calls require an approved
request-level roll-up before comparison.

## Task 4: Build Service-path stability diagnostics list

Implement the right side of Service-path stability as separate diagnostic rows:
Request Throughput, Pipeline Duration average, Indexing / AI Services average,
and Token Throughput. They provide operational traffic and asynchronous-workload
context; they are not additive parts of request latency or threshold statuses.

```text
throughput_req_s = COUNT(DISTINCT approved request_id) /
                   approved bucket_duration_seconds
pipeline_duration_seconds = AVG(eligible final pipeline duration) / 1000
```

Request Throughput needs a confirmed time bucket and selected summary
(average, peak, latest, or other). Pipeline Duration needs one final pipeline
run per `runId` and an approved terminal-status/retry rule. Keep Indexing / AI
Services as `DATA PENDING` or a service-specific value until its operation
population and aggregation are approved; do not blend Search, indexing,
transcription, translation, and audio durations into one average. Keep Token
Throughput as `DEFINITION PENDING` because the listed token/second,
queries/second, and trace-token alternatives are non-equivalent.

## Task 5: Build Failure surface

Implement the nine workload-specific failure-rate comparisons: Pipeline,
Activity, Job, API, Training, MLflow Span, Indexing, Transcription, and
Translation. Each rate has its own final record key, source taxonomy, and
eligible denominator:

```text
failure_rate(metric) =
  COUNT(DISTINCT approved metric-specific unit where failure rule is true) /
  COUNT(DISTINCT eligible metric-specific unit) * 100
```

Use final pipeline/activity runs, job runs, API requests, training runs, MLflow
spans (once its grain is resolved), indexing operations, transcription
operations, and translation operations. Deduplicate retries and retransmissions.
Do not sum rates, compare raw failure counts by bar length, or imply a shared
denominator or severity threshold. Source-specific rules are required for
timeouts, cancellations, partial results, `failed_document_count`, content
filtering, and especially whether MLflow Span Error Rate is span-based or
training-run-based.

## Task 6: Build Operational control coverage

Implement Operational control coverage as its five explicit readiness states:
Training Reproducibility `DEFINITION PENDING`; Audit Logging, Tool Usage
Compliance, Model Governance, and Environment Compliance `CALCULATION PENDING`.

No numeric aggregation is authorized for this section. It communicates whether
an operational-control calculation exists for the selected scope; it does not
assert that a control is absent, failed, compliant, or healthy. Do not invent a
reproducibility test, mandatory audit event set, allowed-tool policy,
governed-model population, environment policy, denominator, or threshold.

## Task 7: Add Safety and security readiness

Reuse the existing shared Safety and security readiness components in the
dashboard content area. This section presents the approved Safety Evaluation
Score, MLflow Safety Score, PII Leakage (Agent Only), and UPIA states. Do not
rebuild the shared components or add calculation logic as part of this task.

## Detail-view drawer tasks

Each selected Operations element opens its approved compact, non-scrolling
right-side drawer over the dimmed main view. Preserve the active time,
business-unit, project, and channel context. Drawers add operational trend,
calculation provenance, or readiness context; they do not create a new page or
an incident-management workflow. Do not expose raw errors, traces, prompts,
responses, identifiers, sensitive values, alert actions, remediation controls,
or model/deployment filters.

## Task 8: Build the Failure surface drawer

Implement the Failure surface drawer as a compact comparison of the nine
workload-specific illustrative rates: Pipeline, Activity, Job, API, Training,
MLflow Span, Indexing, Transcription, and Translation. Add a calculation-context
table showing the distinct eligible unit for each workload and a `PENDING`
filter-coverage state.

Preserve `FAILURE CLASSIFICATION PENDING` and `INDEXING PARTIAL-FAILURE RULE
PENDING`. The drawer adds rate provenance, not root-cause analysis: each
workload retains its own denominator. Do not show raw errors, counts, a
combined rate, thresholds, incidents, or remediation controls.

## Task 9: Build the Operational control coverage drawer

Implement the Operational control coverage drawer with its five control
readiness rows: Training Reproducibility, Audit Logging, Tool Usage Compliance,
Model Governance, and Environment Compliance. For each row, show its explicit
pending state and the missing rule required before calculation, such as the
reproducible-run definition, required audit-event set, allowed-tool policy,
eligible-model policy, or environment policy.

Add concise mapped field-family context—training/lineage, audit/application,
tool/agent, model-registry/evaluation, and environment/application fields—to
explain evidence availability. Do not derive a compliance score or expose user
identities, model URIs, audit notes, application lists, approvals, or
remediation workflows.

## Task 10: Build the Operational situation drawer

Implement the Operational situation drawer with the three illustrative
stability signals—End-to-End P95 (`1.20 s`), API Error Rate (`1.14%`), and
Pipeline Failure Rate (`0.7%`)—a compact 30-day three-series trend, and a
calculation-context table. Retain `Alert feed — THRESHOLD PENDING` and its
explanation that no alert rule or threshold contract is available.

The drawer shows direction and calculation provenance, not a composite health
score or incident conclusion. Keep P95, error/eligible-request, and
failure/eligible-pipeline-run calculations distinct, with `PENDING` filter
coverage. Do not show raw errors, alert counts, incident actions,
recommendations, or a live alert feed.

## Task 11: Build the Requested operations coverage drawer

Implement the Requested operations coverage drawer as a monitoring-readiness
matrix for Uptime / SLA, CPU / Memory, System Load, and Alert feed. Each must
retain its explicit status and missing contract category: formula/target,
telemetry fields, or alert rule.

Include the clear boundary that pending does not mean zero, healthy, or an
unavailable service, and that no live infrastructure measurement contract has
been supplied. Do not show utilization percentages, uptime percentage, load
values, alert counts, owners, severity, incident controls, charts, or
recommendations.

## Task 12: Build the Safety and security readiness drawer

Implement the Safety and security readiness drawer with its four readiness
rows: Safety Evaluation Score `CALCULATION PENDING`, MLflow Safety Score
`0.91 / 1`, PII Leakage (Agent Only) `DATA PENDING`, and UPIA `TEST RESULTS
PENDING`. Add a concise calculation-and-coverage table and the explicit
`EVALUATOR COVERAGE PENDING` state.

Show MLflow Safety as `AVG(Safety)` on a 0-1 scale and keep its styling neutral;
the illustrative value is not a favorable state or threshold result. Do not
show evaluator reasons, PII, prompts/responses, attack content, breaches,
incidents, thresholds, or remediation.

## Task 13: Build the Service-path runtime context drawer

Implement the Service-path runtime context drawer for the right-side list only:
Request Throughput (`42.8 req/s`), Pipeline Duration average (`42 s`), Indexing
/ AI Services average (`620 ms`), and Token Throughput `DEFINITION PENDING`.
Add a calculation-context table with each metric's calculation type, unit, and
`PENDING` filter coverage.

Keep the units and populations separate and state that these measures are not a
combined health score. Do not include the latency chart, capacity/quota/cost
metrics, infrastructure utilization, raw records, or alert information.

## Task 14: Build the Service-path stability chart drawer

Implement the Service-path stability drawer for the left latency chart only:
End-to-End P95, Model Response average, Retrieval average, and Tool Call
average. Include four compact latest-value cards, an enlarged 30-day trend on a
millisecond axis, and a metric table that makes P95 versus average calculations
and `PENDING` filter coverage explicit.

Retain `Component times are not additive` and the pending time-bucket,
timezone, and attribution notice. Exclude the runtime-context list, raw traces,
request IDs, raw errors, thresholds, and recommendations.
