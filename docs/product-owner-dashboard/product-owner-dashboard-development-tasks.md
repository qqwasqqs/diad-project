# Product Owner Dashboard Development Tasks

## Scope and delivery boundary

Build the Product Owner dashboard content shown in the approved concept. The
existing dashboard shell already provides the title, top filters, and header;
the left navigation is out of scope. Reuse the shared components already
available for Product experience pulse and Trust and measurement readiness;
do not rebuild them or redefine their calculations in this work.

All displayed values in the concept are illustrative. Apply the selected time,
business-unit, project, and channel scope before calculating a supported
metric. If a selection cannot be reliably attributed, show `FILTER BREAKDOWN
UNAVAILABLE` or `DATA PENDING`; never display an unfiltered value as filtered
or substitute zero for unavailable data.

## Task 1: Add Product experience pulse

Reuse the existing shared Product experience pulse components in the dashboard
content area. This section provides the at-a-glance Session & Query Volume,
User Satisfaction Rate, End-to-End Latency, and Workflow Completion states
from the approved concept. Do not recreate these components or add new
calculation logic as part of this task.

## Task 2: Build Adoption and engagement

Implement the 30-day adoption card with daily `Sessions` and `Queries` lines,
plus the supporting `queries/session` and average-session-duration values.
Use the approved query identity only once it is supplied by the data contract:

```text
total_queries       = COUNT(DISTINCT approved query_key)
total_sessions      = COUNT(DISTINCT session_id)
queries_per_session = total_queries / total_sessions

session_duration_minutes = (MAX(timestamp_start per session)
                            - MIN(timestamp_start per session)) / 60 seconds
avg_session_minutes = AVG(session_duration_minutes)
```

Daily series must use the same eligible, deduplicated user-query population as
the supporting values. Exclude tool calls, model calls, agent steps, automatic
retries, and invalid session/timestamp records rather than treating them as
zero. Keep this section focused on observed product use; it must not imply
feature adoption, workflow completion, satisfaction, or business value.

## Task 3: Build Channel mix

Implement the compact horizontal channel-share breakdown using the same
eligible, deduplicated user-query population as Adoption and engagement.
Calculate each displayed share only over classified, approved channel values:

```text
channel_queries(channel) = COUNT(DISTINCT approved query_key where channel = value)
all_classified_queries   = SUM(channel_queries for approved channel values)
channel_share_percent    = channel_queries(channel) / all_classified_queries * 100
```

Keep unknown, null, and unmapped channels separate from named channels. The
shares represent query volume by entry channel, not users, features, outcomes,
or completion. Confirm the normalized channel vocabulary, whether the global
channel filter should affect this view, and the approved time/attribution rules
before presenting live values.

## Task 4: Build Experience and response quality

Build the quality section using the existing shared User Satisfaction Rate and
End-to-End Latency components from Product experience pulse; embed them without
reimplementing their calculations. Retain the explicit adjacent-signals,
no-causal-claim treatment.

For the quality trend, render daily averages for Groundedness, Relevance
Quality, and Intent Resolution only when their scores are confirmed compatible
with the shared 1-5 axis:

```text
score_point(metric, day) = AVG(valid, compatible metric_score in day)
display_point            = round(score_point, approved precision)
```

Do not average daily averages with unequal sample sizes, mix 0-1 scores (such
as MLflow) or F1 measures into this chart, or treat missing/invalid scores as
zero. Deduplicate repeated evaluator results at the approved
completion/request/evaluation grain and preserve coverage separately.

Show Retrieval Quality and Task Adherence as distinct supporting values, not a
composite:

```text
retrieval_quality = AVG(valid retrieval_score)
task_adherence    = AVG(valid task_adherence_score)
```

Both display on the documented 1-5 scale, rounded to one decimal. Confirm the
Intent Resolution scale and direction, evaluator version/population, timestamp
and timezone, coverage, and selected-filter attribution before live rollout.

## Task 5: Build Future usage evidence

Implement the Feature usage evidence pending-state component exactly as a
nonnumeric `DATA PENDING` state. The current dashboard evidence has no stable
feature identifier, feature event, exposure/eligibility definition, or
authorized feature-usage formula. Session and query volume must not be used as
a proxy for feature-level usage.

The UI should communicate that the metric is unavailable for the selected
scope, not that feature usage is zero. A future implementation requires an
approved event taxonomy, event key, grain, denominator, retry treatment, and
scope attribution before any feature-usage count or rate can be displayed.

## Task 6: Add Trust and measurement readiness

Reuse the existing shared Trust and measurement readiness components in the
dashboard content area. This section presents the approved Safety Evaluators,
MLflow Safety Score, PII Leakage (Agent Only), and UPIA readiness states. Do
not rebuild these components or add new calculation logic as part of this task.

## Detailed-view drawer tasks

Each selected dashboard section opens its approved compact, non-scrolling
right-side drawer over the dimmed Product Owner dashboard. Preserve the active
time, business-unit, project, and channel context. Drawers add a focused
Product Owner question; they do not repeat the originating main-view cards,
charts, or headline values. Do not expose raw prompts/responses, user IDs,
correlation IDs, evaluator reasons, raw errors, service diagnostics, or
model/deployment configuration.

## Task 7: Build the Product experience pulse drawer

Implement the Product experience pulse drawer as an experience-journey
context view. Show illustrative time-based engagement (`Sessions` and
`Queries`) and responsiveness (End-to-End P95) mini-trends instead of
duplicating the four headline cards. Keep the explicit note that engagement
and responsiveness are adjacent signals, not causal evidence.

Include feedback readiness: the positive/negative composition may appear as
context, but feedback trend and coverage remain pending until timestamp and
request-correlation rules are approved. Include workflow-measurement readiness
for workflow key, terminal outcome, eligible denominator, and scope
attribution; retain `DATA PENDING` because no completion formula is supplied.
Finish with the approved measurement-context table for Session & Query Volume,
User Satisfaction Rate, End-to-End Latency, and Workflow Completion, without
introducing a feature-usage metric or per-request technical diagnostics.

## Task 8: Build the Adoption and engagement drawer

Implement the Engagement patterns drawer as a within-session behavior view.
Add a session-depth distribution based on the distinct approved query key per
session, a timestamp-derived session-duration distribution, a conditional
conversations-per-session view, and a measurement-coverage summary for
session ID, conversation ID, timestamp, and channel.

The query-depth and duration bands are illustrative design groupings, and
`conversations per session = COUNT(DISTINCT conversation_id) / COUNT(DISTINCT
session_id)` remains a proposed aggregation pending a validated
session/conversation relationship. Do not repeat the main Sessions/Queries
trend or headline totals, and do not represent engagement patterns as feature
adoption or workflow completion.

## Task 9: Build the Channel mix drawer

Implement the Channel engagement patterns drawer to add change-over-time and
cautious engagement context. Include a daily 100%-stacked share trend for the
classified Web, Teams, Mobile, and API query population, plus a conditional
channel-level comparison of queries per session and average session duration.

The comparison requires an approved one-entry-channel assignment for each
session and uses the adoption session and query rules. Add a channel
attribution-readiness state for vocabulary, session assignment, timestamp, and
business-unit/project attribution. Do not repeat the main channel-share bars,
assign unknown/multi-channel sessions to a named channel, or claim that a
channel causes satisfaction, performance, feature adoption, or completion.

## Task 10: Build the Experience and response quality drawer

Implement the Experience quality evidence drawer as a decision-readiness view,
not another quality chart. Include evaluator coverage states for Groundedness,
Relevance Quality, Intent Resolution, Retrieval Quality, and Task Adherence;
the score-definition map with calculation, scale, and record-grain state; and
comparability guardrails.

Keep confirmed 1-5 signals separate, leave Intent Resolution as `SCALE
PENDING`, and do not create a composite quality score. Include the feedback-to-
quality and latency-to-quality correlation requirements as pending evidence;
the main-view `84% positive` and `P95 1.20 s` may appear only as a neutral
context row with no causal claim. Exclude repeated trend/cards, Hallucination,
F1, MLflow values, and raw evaluation content.

## Task 11: Build the Feature usage evidence drawer

Implement the Feature measurement decision canvas with a prominent `DATA
PENDING` state. It must help a Product Owner choose one pending measurement
purpose—usage events, feature adoption, or repeat feature use—without
selecting a purpose or displaying a metric.

Show the minimum evidence required for each choice (feature identifier,
approved usage event, exposure/eligible population, event key/timestamp, and
scope attribution), clearly labeled proposed formula shapes, and the pending
decision owners for taxonomy, eligibility/exposure, and privacy/minimum cohort.
Keep feature use distinct from workflow completion, satisfaction, and
session/query volume. Do not show feature names, rates, raw events, schemas,
endpoints, or implementation instructions.

## Task 12: Build the Trust and measurement readiness drawer

Implement the Trust evidence decision guide as a product-decision-readiness
view. Start with `DECISION READINESS PENDING`, then show what Safety
Evaluators, MLflow Safety Score, PII Leakage (Agent Only), and UPIA can inform
and what each cannot establish.

Show the four pending evidence-path gates: definition and scale; coverage and
filter attribution; customer-outcome connection; and an approved decision
rule. Keep the boundary explicit: these signals must not gate adoption,
rollout, release, or user-facing messaging until the path is complete. Do not
repeat the main readiness cards or show calculation tables, raw safety/PII/test
data, incidents, remediation, security diagnostics, a composite trust score,
or a safety/security verdict.
