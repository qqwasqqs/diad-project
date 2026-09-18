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

**Client Questions**

- Is the session ID the same as the conversation ID?
- If they are not the same, what does a session mean and what does a
  conversation mean?
- Which is the larger group: does a session contain conversations, or does a
  conversation contain sessions?
- What tells us that a session starts?
- What tells us that a session ends?
- We have `timestamp_start` for requests, but no confirmed session end time.
  Should the last request time in a session be treated as its end?
- Could the response `timestamp_end` be used, or does it only mark the end of
  one answer?
- When a new `timestamp_start` arrives, how do we know whether it continues the
  current session or starts a new one?
- Should a session end after a period with no activity? If yes, after how many
  minutes?
- What counts as one query? Can `request_id` be used for it?
- If the system retries the same query, should it still count only once?
- Should failed or abandoned queries be included?
- If a session continues after midnight, should it remain one session?
- Can these records be connected to the selected business unit, project, and
  channel?

## 2. API Error Rate — classification and coverage pending

**Business meaning**
Would show the share of eligible distinct user requests whose approved final
outcome is an API error in the selected period and scope. It is a reliability
signal, not a root-cause diagnosis, satisfaction measure, workflow-completion
rate, or count of every failed internal component call.

**In simple terms**
We want to know how often an eligible user request ends in an API error. Before
we trust the percentage, we need to agree what one counted request is, which
outcomes count as errors, and which outcomes belong in the total.

**What is needed to display live data**
An approved request-level counting grain, one final outcome and timestamp per
counted request, an approved error classification and eligible denominator,
and reliable business-unit/project attribution. The implemented `1.14%`, `114`
error requests, and `10,000` eligible requests remain illustrative until those
requirements are confirmed.

**Proposed aggregation — approval pending**

After applying the selected time, business-unit, and project filters, Splunk
would select one approved final outcome per counted request and calculate:

```text
eligible_request_count = COUNT(DISTINCT request_id)
  where final response_status is an approved eligible outcome

error_request_count = COUNT(DISTINCT request_id)
  where final response_status is an approved error outcome

api_error_rate_percent =
  error_request_count / eligible_request_count * 100
```

This is a proposed calculation, not an approved live rule. If the eligible
request count is zero, the result is `NO_DATA`, not `0%`.

**Fields needed**

| Needed field or rule | Status in Concept | Concept comparison |
| --- | --- | --- |
| `response_status` | Existing for this metric | Listed for API Error Rate with documented values `success`, `error`, `timeout`, and `content_filtered`; their numerator/denominator treatment is not approved. |
| `status_code` | Existing for this metric | Listed for API Error Rate; the treatment of HTTP `4xx`, `5xx`, and `429` outcomes is open. |
| `error_code (API)` | Existing for this metric | Listed for API Error Rate as structured error evidence. It must not cause one failed request to be counted twice. |
| `error_message (API)` | Existing for this metric | Listed for API Error Rate as diagnostic detail; never display or return it to the Product Owner view. |
| `request_id` | Existing elsewhere only | Listed for Request Throughput and established as one user query, but not approved as the API Error Rate counting grain. |
| Request/event `timestamp` | Existing elsewhere only | Listed for Request Throughput, but the timestamp for one final API outcome is not approved. |
| `correlation_id` | Existing elsewhere only | Available platform-wide for internal joins when the approved request key is not carried directly by the outcome record. |
| Final-outcome and eligible-denominator rule | Not documented | No rule selects one final request outcome or defines all numerator and denominator outcomes. |
| `business_unit`, `project_name` | Existing elsewhere only | Available as canonical Splunk filters, but reliable attribution of API outcomes to both dimensions must be confirmed. |

**Correlation needed**
Within Splunk, associate the approved terminal API outcome with the approved
request key and timestamp, use `correlation_id` only where a cross-log join is
needed, and remove repeated producer events or retries before aggregation.
Apply the approved business-unit and project filters before calculating the
error-request count, eligible-request count, and percentage. React receives
only those ready-to-display aggregates and an availability state.

**Client Questions**

- Should this KPI count one user-submitted request or every underlying API
  call made while serving that request?
- Which final outcomes should count as API errors, and which outcomes should be
  included in the total eligible requests? Please clarify the treatment of
  timeouts, content-filtered responses, HTTP `4xx`, `5xx`, and `429` outcomes.
- Does the source evidence provide one request identifier, one final outcome,
  and one timestamp that belong together for each counted request?
- Can each counted request be reliably connected to the selected business unit
  and project?
- Is there a minimum number of eligible requests required before the
  percentage should be shown?

## 3. End-to-End Latency — selected-scope trend coverage pending

**Business meaning**
Shows the user-experience speed of eligible requests from submission through
final rendering. The Product Owner view uses P95, so it describes how long
95% of eligible requests took. It is displayed alongside API Error Rate as
decision context only; neither signal proves that it caused the other.

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
API-error correlation is not required for this metric and must not be inferred
from adjacent visual placement.

**Client Questions**

- Should the drawer continue to show P95 waiting time rather than average
  waiting time?
- Does waiting time start when the user presses submit?
- Does it end when the first part of the answer appears, or when the full answer
  has finished rendering?
- Does one `request_id` always mean one user request?
- If one request creates several records with the same `correlation_id`, how do
  we choose the correct start and final answer?
- If a request is retried, should we count the first attempt, the final attempt,
  or the full time the user waited?
- Should failed, cancelled, timed-out, and content-filtered requests be included
  in the latency number?
- What should happen when the start or end time is missing?
- Which time zone decides which day receives the request?
- Can every request be connected to the selected business unit, project, and
  channel?
- What waiting time should be shown as good, needs attention, or poor?
- What should the drawer show when there are no valid requests?

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

**Client Questions**

- What user task should “workflow” mean for each product or use case?
- Where does that workflow start?
- What exact result means the workflow is complete?
- Can a workflow have more than one successful ending?
- What identifies one workflow from start to finish?
- Should every started workflow be included in the total, or only workflows
  that meet certain conditions?
- How should we treat a user who cancels, leaves, or only partly completes the
  workflow?
- If the system retries a step, is it still the same workflow?
- How long can a workflow remain open before we call it abandoned?
- Do we have a date and time for the start and final result?
- Can a workflow be connected to the selected business unit, project, and
  channel?
- Who is allowed to see the workflow summary?
- What should the drawer show when the definition is missing, when there are no
  workflows, or when the KPI does not apply?

## Excluded from this tracker

This drawer intentionally does not add component latency, raw error messages,
an error breakdown, user identifiers, User Satisfaction Rate, or a causal
analysis between API errors and latency. Those are outside the current Product
Experience Pulse scope or lack an approved metric/display contract.

## Quick view — required confirmations

| Displayed metric | Confirmation needed |
| --- | --- |
| Session & Query Volume | Query identity; session and deduplication rules; time and selected-scope attribution. |
| API Error Rate | Request-level grain; error and eligible-outcome rules; final-outcome timestamp; business-unit/project attribution; minimum sample. |
| End-to-End Latency | Eligible-request definition; correlation-ID event pairing and deduplication; time and selected-scope attribution. |
| Workflow Completion | Workflow definition/key; terminal outcomes and denominator; lifecycle coverage and API pending-state contract. |
