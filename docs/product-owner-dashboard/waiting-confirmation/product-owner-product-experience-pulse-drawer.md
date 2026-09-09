# Product Experience Pulse Drawer — Waiting for Confirmation

## Scope

This tracker covers only elements currently displayed in the **Product
Experience Pulse** main-view section or its detail drawer for which data,
coverage, a definition, or an approval is still missing. It does not list
elements whose display contract is already clear, and it does not turn a
pending state into a zero value.

All displayed values and chart trajectories remain illustrative until the
listed confirmations are complete.


## Confirmed platform capability

Every application and component will emit a `correlation_id` in its logs. The
tracker therefore treats it as an available cross-log join field and never as
a display field. It can connect related emitted events, but it does **not** by
itself define a unique user query, a session, or a workflow. Those identities,
their event-pairing rules, and their aggregation semantics still require the
confirmations listed below.

### Field-status legend

The statuses below compare the required field with the Concept's documented
**Key fields** inventory. They do not confirm live telemetry or an API response.

- **Existing for this metric** — listed for the same Concept metric.
- **Existing elsewhere only** — present in another Concept metric, but not
  supplied or approved for this metric.
- **Not documented** — absent from the Concept's field inventory for the
  required purpose.

## 1. Session & Query Volume — measurement coverage pending

**Business meaning**  
Shows whether people are using the product, how often they interact during a
session, and how long observed sessions span. It is an adoption signal; it is
not evidence of satisfaction, feature adoption, workflow completion, or
business value.

**In simple terms**  
We want to see how many people use the product, how many questions they ask,
and how long they stay in a session. Before we trust the numbers, we need to
agree what counts as one question and one session, and how duplicate logs are
removed.

**What is needed to display live data**  
An approved definition of one user-submitted query, a session boundary rule,
daily time buckets, and a reliable selected-scope population. The current
Sessions and Queries trend and the queries-per-session context must come from
the same eligible, deduplicated population.

**Fields needed**

| Needed field | Status in Concept | Concept comparison |
| --- | --- | --- |
| `session_id` | Existing for this metric | Listed for Session & Query Volume. |
| `conversation_id` | Existing for this metric | Listed for Session & Query Volume. |
| `user_id` | Existing for this metric | Listed for Session & Query Volume; aggregate/deduplicate only, never display. |
| `channel` | Existing for this metric | Listed for Session & Query Volume. |
| `timestamp_start` | Existing for this metric | Listed for Session & Query Volume. |
| `correlation_id` | Existing elsewhere only | Listed for User Accountability, not Session & Query Volume; the platform-wide logging decision makes it available for joins, subject to metric-specific approval. |
| `query_key` | Not documented | No canonical query-key field is listed in the Concept. |
| `request_id` | Existing elsewhere only | Listed for Request Throughput, not Session & Query Volume; it is not yet approved as the query key. |

**Correlation needed**  
Associate each approved query with its session through `session_id`; use the
platform-wide `correlation_id` to connect related component logs where needed;
and use the approved query key to identify and deduplicate query events. Derive
session span from the first and last valid timestamps. Attribute the resulting
population to the selected business unit, project, and channel only when that
mapping is reliable.

**Waiting for approval / confirmation**

- Canonical query key and retry/deduplication rules.
- Session start, end, idle-gap, and cross-day handling rules.
- Whether failed or abandoned submissions belong in the population.
- Timestamp timezone and daily-bucketing rule.
- Business-unit, project, and channel attribution for the selected scope.
- No-data and coverage behavior.

## 2. User Satisfaction Rate — feedback trend and coverage pending

**Business meaning**  
Shows the share of valid feedback in the selected scope that is positive. It
does not represent all users or all requests, measure workflow completion, or
prove that latency causes satisfaction.

**In simple terms**  
We want to know whether the feedback people actually submit is positive or
negative. Before we show a trend, we need to know when each feedback event
happened, what response it refers to, and how its score should be interpreted.

**What is needed to display live data**  
An approved feedback scale and positive/negative classification, a feedback
event timestamp for time-based trends, a valid-feedback denominator, and one
approved feedback record per response or request. The drawer may continue to
show the composition only after the same rules support the headline rate.

**Fields needed**

| Needed field | Status in Concept | Concept comparison |
| --- | --- | --- |
| `user_feedback_score` | Existing for this metric | Listed for User Satisfaction Rate. |
| `correlation_id` | Existing elsewhere only | Listed for User Accountability, not User Satisfaction Rate; the platform-wide logging decision makes it available for joins, subject to metric-specific approval. |
| Feedback event `timestamp` | Not documented | The Concept explicitly says feedback timestamp is still open; it is not listed as a User Satisfaction Rate field. |
| `user_id` | Existing for this metric | Listed for User Satisfaction Rate; aggregate/deduplicate only, never display. |
| `application_name` | Existing for this metric | Listed for User Satisfaction Rate. |
| `business_unit` | Existing elsewhere only | Listed for Business Ownership, not User Satisfaction Rate attribution. |
| `project_name` | Existing elsewhere only | Listed for Business Ownership, not User Satisfaction Rate attribution. |
| `channel` | Existing elsewhere only | Listed for Session & Query Volume and Access Traceability, not User Satisfaction Rate attribution. |

**Correlation needed**  
Use the platform-wide `correlation_id` to link feedback to the evaluated
response or request. Then apply an approved first, latest, or feedback-history
rule when feedback changes, deduplicate to the approved grain, and join the
result to the selected scope. Correlation to latency is **not** required to
draw a feedback trend; it would be a separate, future analysis and must not
imply causation.

**Waiting for approval / confirmation**

- Whether the score is binary (`1`/`0`) or uses a different positive rule.
- Response, request, conversation, or session grain for one effective
  feedback event.
- Handling of changed, missing, invalid, and neutral feedback.
- Feedback timestamp availability and its timezone.
- Which correlation-ID-linked response/request is the valid feedback target,
  and selected-scope attribution.
- Feedback-coverage denominator, privacy/minimum-cohort rules, and no-data
  behavior.

## 3. End-to-End Latency — selected-scope trend coverage pending

**Business meaning**  
Shows the user-experience speed of eligible requests from submission through
final rendering. The Product Owner view uses P95, so it describes how long
95% of eligible requests took. It is adjacent to satisfaction as decision
context only; it is not evidence of a causal effect on satisfaction.

**In simple terms**  
We want to know whether users are waiting too long for an answer. Before we
show a reliable value or trend, we need to pair the start and end of each
request correctly and agree which requests count.

**What is needed to display live data**  
An eligible, deduplicated request-level population, a P95 value calculated
from that population, and timestamped records that can be assigned to the
selected period and dimensions. The headline and drawer trend must reuse one
canonical definition.

**Fields needed**

| Needed field | Status in Concept | Concept comparison |
| --- | --- | --- |
| `timestamp_start` | Existing for this metric | Listed for End-to-End Latency. |
| `timestamp_end` | Existing for this metric | Listed for End-to-End Latency. |
| `response_latency_ms` | Existing for this metric | Listed for End-to-End Latency. |
| `correlation_id` | Existing elsewhere only | Listed for User Accountability, not End-to-End Latency; the platform-wide logging decision makes it available for joins, subject to metric-specific approval. |
| Request-level key | Existing elsewhere only | `request_id` is listed for Request Throughput, not End-to-End Latency, and is not yet approved as this metric's eligible-request key. |
| `business_unit` | Existing elsewhere only | Listed for Business Ownership, not End-to-End Latency attribution. |
| `project_name` | Existing elsewhere only | Listed for Business Ownership, not End-to-End Latency attribution. |
| `channel` | Existing elsewhere only | Listed for Session & Query Volume and Access Traceability, not End-to-End Latency attribution. |

**Correlation needed**  
Use the platform-wide `correlation_id` to join the submission and
final-response events for one eligible request, then deduplicate repeated
telemetry before calculating P95. Confirm how the correlation ID behaves when
one request has retries, multiple component events, or more than one final
response. Correlate to selected dimensions only after attribution is reliable.
Feedback correlation is not required for this metric and must not be inferred
from adjacent visual placement.

**Waiting for approval / confirmation**

- Eligible-request definition and request-level key.
- Correlation-ID event-pairing and retry/multiplicity semantics.
- Retry, duplicate, timeout, and missing-timestamp treatment.
- Timestamp timezone and time-bucket rule for the trend.
- Business-unit, project, and channel attribution; otherwise use the approved
  unavailable/no-data state rather than an unfiltered value.
- Threshold direction and no-data behavior if the illustrative state is
  replaced.

## 4. Workflow Completion — definition and data pending

**Business meaning**  
Would show the share of eligible product workflows that reach an approved
terminal outcome. The current `DATA PENDING` state means that this measure is
not available; it does not mean zero completions, failed workflows, or no
product value.

**In simple terms**  
We want to know whether users finish an important product journey. Before we
can calculate that, we must agree what the journey is, how it starts, what
counts as finishing it, and which journeys belong in the total.

**What is needed to display live data**  
One approved workflow definition for each product/use case, lifecycle events
for workflow start and terminal outcome, an eligible denominator, and a
completion formula. The drawer's readiness steps make these missing
prerequisites visible instead of fabricating a percentage.

**Fields needed**

| Needed field | Status in Concept | Concept comparison |
| --- | --- | --- |
| `workflow_key` | Not documented | No workflow key is listed. |
| `correlation_id` | Existing elsewhere only | Listed for User Accountability, not Workflow Completion; it connects component logs but is not a workflow key. |
| Workflow start timestamp/event | Not documented | No workflow start event is listed. |
| Terminal status/outcome and timestamp/event | Not documented | The Concept explicitly identifies the terminal workflow state as missing; component `response_status` and `training_status` are not substitutes. |
| Cancellation, abandonment, retry, and partial-success fields | Not documented | No workflow-lifecycle fields are listed. |
| `business_unit` | Existing elsewhere only | Listed for Business Ownership, but no workflow attribution contract is supplied. |
| `project_name` | Existing elsewhere only | Listed for Business Ownership, but no workflow attribution contract is supplied. |
| `channel` | Existing elsewhere only | Listed for Session & Query Volume and Access Traceability, but no workflow attribution contract is supplied. |

No currently supplied Product Owner mapping fields, including
`correlation_id`, are authorized substitutes for the workflow key or terminal
outcome fields.

**Correlation needed**  
Use `correlation_id` to connect related component logs within the journey, but
group lifecycle events by the approved workflow key. Link starts to terminal
outcomes; apply approved rules for retries, cancellations, abandonments, and
partial successes; then attribute eligible workflows to the selected scope.

**Waiting for approval / confirmation**

- Business definition of a workflow for each product/use case.
- Workflow key, start event, terminal-outcome vocabulary, and completion
  formula.
- Eligible denominator and treatment of cancellation, abandonment, retry, and
  partial success.
- Event coverage, timestamps/timezone, selected-scope attribution, and
  privacy/access rules.
- The API contract for distinguishing `DATA PENDING`, no data, and not
  applicable.

## Excluded from this tracker

This drawer intentionally does not add Feature Usage, component latency,
errors, raw feedback, user identifiers, or a feedback-to-latency causal
analysis. Those are either outside the Product Experience Pulse scope or lack
an approved metric/display contract.

## Quick view — required confirmations

| Displayed metric | Confirmation needed |
| --- | --- |
| Session & Query Volume | Query identity; session and deduplication rules; time and selected-scope attribution. |
| User Satisfaction Rate | Feedback scale and denominator; feedback timestamp; correlation-ID target and privacy rules. |
| End-to-End Latency | Eligible-request definition; correlation-ID event pairing and deduplication; time and selected-scope attribution. |
| Workflow Completion | Workflow definition/key; terminal outcomes and denominator; lifecycle coverage and API pending-state contract. |

