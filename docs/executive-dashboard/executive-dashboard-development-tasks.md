# Executive Dashboard Main-View Development Tasks

## Scope and delivery boundary

Build the Executive Dashboard main-view content shown in the approved concept.
The existing boilerplate already provides the title, top filters, and header;
the left navigation is out of scope. Tasks 1-4 cover the main view; the
approved section-level detail drawers are scoped in Tasks 5-8.

All values, trends, and color cues in the concept are illustrative. Apply the
selected time, business-unit, project, and channel scope before a metric's
aggregation only where attribution is reliable. Otherwise display `DATA
PENDING`, `Project breakdown unavailable`, or another approved unavailable
state; never present a portfolio-wide result as scoped or substitute zero for
missing data.

The dashboard displays normalized, correlated, deduplicated, filtered, and
aggregated results returned by Splunk or an approved API. These tasks do not
define endpoints, query contracts, thresholds, or raw-telemetry access.

## Task 1: Add Executive pulse

Reuse the existing shared Executive pulse components in the dashboard content
area. This section provides the approved End-to-End Latency, API Error Rate,
Session & Query Volume, User Feedback, and Cost per Request summary states.
Do not recreate the components or add new calculation logic as part of this
task.

## Task 2: Build Session & Query Volume

Implement the 30-day Session & Query Volume section with separate daily
`Sessions` and `Queries` trend lines, plus the period-level queries-per-session
and average-session-duration supporting values. Use the approved eligible
user-query population and calculate each bucket after filtering and
deduplication:

```text
bucket_queries  = COUNT(DISTINCT request_id)
bucket_sessions = COUNT(DISTINCT session_id)

total_queries  = COUNT(DISTINCT request_id)
total_sessions = COUNT(DISTINCT session_id)
queries_per_session = total_queries / total_sessions

session_duration_minutes =
  (MAX(timestamp_start per session) - MIN(timestamp_start per session)) / 60
avg_session_minutes = AVG(session_duration_minutes)
```

The supporting values use the complete selected-period calculation, not sums or
averages of plotted points. Daily active-session counts must not be summed to
recreate period distinct sessions, because a session can appear in several
buckets. Do not interpolate missing telemetry or show it as observed zero;
confirmed complete buckets with no activity may show zero. Keep this section
about activity and engagement—not satisfaction, completion, or business value.

## Task 3: Build Cost by BU and Project

Implement the Cost by BU and Project section as grouped horizontal allocation
bars with business-unit totals and their nested project subsets. Aggregate the
already approved request-level token cost by the normalized ownership fields:

```text
business_unit_cost = SUM(request_cost) GROUP BY business_unit
project_cost       = SUM(request_cost) GROUP BY business_unit, project_name
project_share_of_bu = project_cost / business_unit_cost * 100
```

A project cost is a subset of its business-unit total, not an additional cost,
and a request must not be duplicated across owners without an approved
shared-cost allocation rule. Keep missing/conflicting ownership in an explicit
`Unattributed` treatment. Confirm whether the displayed project is the top,
selected, or another representative project before using one nested bar per
business unit. Keep Infrastructure Cost separate as `DATA PENDING`; do not add
it to token-cost bars or infer it from the request-cost data.

## Task 4: Add Safety & risk posture

Reuse the existing shared Safety & risk posture components in the dashboard
content area. This section presents the approved Safety Evaluation Score,
MLflow Safety Score, and PII Leakage (Agent Only) states. Do not recreate the
components or add new calculation logic as part of this task.

## Detail-view drawer tasks

Each selected Executive section opens its approved wide, non-scrolling
right-side drawer over the dimmed main view. Preserve the current portfolio
selection where attribution is supported. Detail remains executive-only and
aggregate-only: do not expose user, session, conversation, request, or model
identifiers; prompts/responses; raw logs/errors; traces; sensitive values; or
operational-investigation controls.

## Task 5: Build Session and query details

Implement the Executive Engagement Details drawer for the Session & Query
Volume chart section. It must add engagement reach and composition rather than
repeat the main sessions-versus-queries trend or the `316K queries`,
queries-per-session, and average-session values.

Show aggregate distinct active users, total sessions, total conversations,
average queries per user, channel-level query/session composition, session-depth
distribution, and conversation context. A conversation is the approved
`session_id` plus `conversation_id` combination; active users use distinct
`user_id`; all query measures use the approved distinct request key. Keep
session-duration distribution as `DATA PENDING` until session expiry,
single-query duration, and cross-period rules are approved. Engagement is
neutral evidence, not a satisfaction, completion, health, or business-outcome
claim.

## Task 6: Build Safety and risk details

Implement one consolidated Safety & risk posture drawer for the whole selected
section, not one drawer per card. Explain the three portfolio signals:
Safety Evaluation as an illustrative impacted-request rate based on approved
category pass/fail results; MLflow Safety Score as `SCALE PENDING`; and PII
Leakage as an illustrative flagged-evaluation rate limited to agent workloads.

Keep evaluation coverage and business-unit/project/channel attribution as
`DATA PENDING`. Do not create a safety score from category severity values,
replace MLflow `SCALE PENDING` with a number, or describe a PII flag as a
confirmed breach. Exclude category counts/trends, model rankings, evaluator
reasons, raw safety events, prompts/responses, thresholds, remediation, and
incident claims.

## Task 7: Build Executive pulse details

Implement one consolidated Executive pulse drawer for the whole pulse section.
Include executive-level detail for End-to-End Latency, API Error Rate, and User
Feedback: latency P95/average trend with current-versus-previous context, an
aggregate API response-status distribution, and feedback distribution plus
anonymous participation summary.

Keep Session & Query Volume and Cost per Request as summary-only signals in
this drawer. Provide compact handoffs to the existing engagement and cost
drawers instead of duplicating their trend or allocation analysis. Do not show
business-unit/project attribution for latency, API errors, or feedback until it
is confirmed; do not add previous-period comparisons for API errors or feedback
without evidence. Exclude identifiers, raw errors, request content, targets,
and recommendations.

## Task 8: Build Cost by BU and Project details

Implement one Executive Cost Allocation drawer for the whole Cost by BU and
Project section. Show a portfolio AI token-cost summary, descending
business-unit allocation bars, a table that represents each displayed project
as a subset of its parent business unit, portfolio-average Cost per Request as
context, and a separate Infrastructure Cost `DATA PENDING` state.

The allocation uses summed eligible request cost; project values must never be
added to their parent business-unit total. Keep shared, cross-project, missing,
or conflicting ownership explicit until an approved allocation rule exists.
Do not make individual bars separate click targets or add trends, period
changes, coverage/freshness, request counts, model/application rankings, raw
billing records, or an operational-investigation action. Never label token-cost
allocation as `Total Cost` or include Infrastructure Cost in it.
