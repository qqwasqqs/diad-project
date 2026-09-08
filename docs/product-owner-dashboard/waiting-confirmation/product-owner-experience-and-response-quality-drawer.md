# Experience Quality Evidence Drawer — Waiting for Confirmation

## Scope

This tracker covers proposed readiness content in the **Experience Quality
Evidence** drawer. It helps a Product Owner decide whether quality signals are
safe to interpret; it does not add a second quality chart, invent coverage
percentages, or turn an evidence gap into a score.

The drawer has five proposals needing client confirmation:

1. evaluator coverage by signal;
2. a score-definition map;
3. comparability guardrails;
4. a feedback-to-quality feasibility check; and
5. a latency-to-quality feasibility check.

The `84% positive · P95 1.20 s` context row is excluded. It is illustrative
context only, proposes no analysis, and makes no causal claim.

## Confirmed platform capability

Every application and component will emit a `correlation_id` in its logs. This
tracker treats it as an available cross-log join field and never as a display
field. It can connect related records, but does **not** define an evaluation, a
request, a feedback event, or a one-to-one relationship between them. Those
identities and pairing rules still need approval.

### Field-status legend

The statuses compare a needed field with the Product Owner Concept's documented
**Key fields** inventory. They do not confirm live data or an API response.

- **Existing for this metric** — listed for the same mapped metric.
- **Existing elsewhere only** — listed for another metric or available under
  the platform-wide logging decision, but not approved for this proposal.
- **Not documented** — absent from the Concept's field inventory for this use.

## 1. Evaluator coverage by signal — proposed readiness check

**Business meaning**
Shows whether each displayed quality signal has enough eligible evaluator
records for the selected scope. This is a readiness check, not a quality score,
percentage, pass/fail result, or statement that missing coverage is zero.

**In simple terms**
Before we use a score, we need to know whether it comes from enough of the
right kind of evaluations. The proposal is to show `COVERAGE PENDING` until
that can be demonstrated for each signal.

**Why we propose it**
The same average can mean very different things when it comes from a small,
offline, red-team, or incomplete sample instead of comparable production
evaluations. The readiness state prevents an unverified average from looking
decision-ready.

**What is needed to display live data**
An approved evaluation identity and timestamp; evaluator version and
population; eligibility and deduplication rules; a coverage threshold; and
reliable business-unit, project, and channel attribution. The API should return
approved aggregate included/eligible counts or an availability state, never raw
evaluator records.

**Fields needed**

| Needed field | Status in Concept | Concept comparison |
| --- | --- | --- |
| `groundedness_score` | Existing for this metric | Listed for Groundedness and Hallucination. |
| `relevance_score` | Existing for this metric | Listed for Relevance Quality. |
| `intent_resolution_score` | Existing for this metric | Listed for Intent Resolution Score. |
| `retrieval_score` | Existing for this metric | Listed for Retrieval Quality. |
| `task_adherence_score` | Existing for this metric | Listed for Task Adherence Score. |
| `evaluation_key` | Not documented | The data contract requires a normalized key; `evaluation_run_id` and `completion_id` are candidates, not an approved record grain. |
| Evaluation `timestamp` | Not documented | Required for period and freshness rules; no quality-metric timestamp is listed. |
| Evaluator version and population | Not documented | Needed to separate online production, offline, test, and red-team evaluation. |
| `business_unit`, `project_name`, `channel` | Existing elsewhere only | Listed for Business Ownership or session/access metrics, not approved evaluation attribution. |

**Correlation needed**
Group each valid score by an approved evaluation key. Keep evaluator versions
and populations separate, deduplicate repeated evaluations at the approved
evaluation/request/completion grain, then calculate aggregate coverage for the
selected scope. `correlation_id` may connect component logs; it does not replace
the evaluation key.

**Waiting for approval / confirmation**

- The canonical evaluation key and whether `evaluation_run_id`, `completion_id`,
  or another key defines one record.
- Evaluator/version and eligible population for each signal, including online,
  offline, test, and red-team results.
- Coverage threshold, numerator/denominator, freshness rule, and partial state.
- Timestamp/timezone, missing or invalid score, and repeated-evaluation rules.
- Selected-scope attribution and `NO_DATA`, partial, and unavailable API states.

## 2. Score-definition map — proposed transparency aid

**Business meaning**
Shows the calculation, displayed scale, and record-grain state for each quality
signal. It lets a Product Owner see what a score means before comparing it with
another one. It does not calculate a new metric.

**In simple terms**
The map labels how each score is averaged, which scale it uses, and whether we
know what one input record represents. This avoids comparing numbers that look
alike but were produced in different ways.

**Why we propose it**
All five signals have an average-score formula, but the evaluation record grain
is open. Four have a documented `1–5` scale. The mapping describes Intent
Resolution as Likert `1–5`, while the approved main-view calculation
specification still requires shared-scale/direction confirmation. Intent
Resolution therefore remains `SCALE PENDING` in the drawer until the client
resolves that inconsistency for this display.

**What is needed to display live data**
An approved definition for every signal: valid-value rules, scale and direction,
evaluator/version/population, and the grain at which duplicates are removed. A
trend must average eligible records, not daily averages with unequal populations.

**Fields needed**

| Needed field | Status in Concept | Concept comparison |
| --- | --- | --- |
| `groundedness_score`, `groundedness_result` | Existing for this metric | `AVG(groundedness_score)`; stated Likert `1–5`. |
| `relevance_score`, `relevance_result` | Existing for this metric | `AVG(relevance_score)`; stated Likert `1–5`. |
| `intent_resolution_score`, `intent_resolution_result` | Existing for this metric | `AVG(intent_resolution_score)`; the mapping says Likert `1–5`, but the approved calculation specification leaves shared-scale/direction approval open. |
| `retrieval_score`, `retrieval_result` | Existing for this metric | `AVG(retrieval_score)`; stated Likert `1–5`. |
| `task_adherence_score`, `task_adherence_result` | Existing for this metric | `AVG(task_adherence_score)`; stated Likert `1–5`. |
| `evaluation_key`, evaluation `timestamp` | Not documented | Required for record grain, deduplication, and time bucketing. |
| Evaluator version and population | Not documented | Required to establish comparable records. |

**Correlation needed**
The map does not join two business populations. For each signal, retain the
score, evaluator/version/population, and timestamp under an approved evaluation
key before aggregation. Do not assume `evaluation_run_id` or `completion_id`
exists for every signal without confirmation.

**Waiting for approval / confirmation**

- Intent Resolution scale, favorable direction, and permission to share the
  main-view axis.
- Record grain, deduplication, valid/missing/invalid score treatment, rounding,
  and display precision for every signal.
- Evaluator/version/population compatibility and timestamp/timezone rules.
- Whether pass/fail result fields have an approved Product Owner meaning. This
  drawer does not propose a threshold or pass rate.

## 3. Comparability guardrails — proposed decision boundary

**Business meaning**
Keeps confirmed compatible quality scores separate, flags Intent Resolution as
unresolved, and states that a composite quality score is not authorized. It is
a guardrail, not another score or ranking.

**In simple terms**
Five quality checks do not all answer the same question. We propose showing
them side by side only when they use the same understood scale, rather than
adding them into one attractive but misleading number.

**Why we propose it**
Groundedness, relevance, retrieval quality, and task adherence are documented
as `1–5` Likert scores. Even compatible scales measure different aspects of
quality, while Intent Resolution's display compatibility needs client
confirmation. The data contract explicitly prohibits a composite quality score.

**What is needed to display live data**
Approved scale, direction, population, and evaluation grain for each displayed
signal. No calculation is needed to show the guardrail. A composite can only be
considered after a client-approved business meaning, weighting, normalization,
and validation plan exist.

**Fields needed**

| Needed field | Status in Concept | Concept comparison |
| --- | --- | --- |
| `groundedness_score`, `relevance_score`, `retrieval_score`, `task_adherence_score` | Existing for their metrics | Each is documented as a Likert `1–5` score. |
| `intent_resolution_score` | Existing for this metric | Its average formula exists; shared display scale/direction approval remains open. |
| Evaluator version and population | Not documented | Score values alone cannot establish compatibility. |
| `evaluation_key` | Not documented | Needed to verify record grain before comparing aggregates. |

**Correlation needed**
No cross-metric correlation or composite is proposed. Calculate each score from
its own approved, comparable population. Retain the guardrail whenever those
populations cannot safely be compared.

**Waiting for approval / confirmation**

- Intent Resolution scale and favorable direction.
- Whether evaluator versions and populations are comparable across signals.
- Any future composite's Product Owner decision, business definition, weighting,
  normalization, validation, and accountable owner. Until then it is prohibited.
- Confirmation that `0–1` MLflow and F1-like measures stay outside the shared
  `1–5` quality display.

## 4. Feedback-to-quality correlation — proposed feasibility check

**Business meaning**
Would determine whether approved, correlated feedback and quality records can
be examined together. It does not claim that a quality score causes
satisfaction or that satisfaction validates the evaluator.

**In simple terms**
We may want to see whether responses with a quality evaluation also received
feedback. First we must prove that both records refer to the same approved
response or request and occurred in a usable time period.

**Why we propose it**
Feedback is a user signal and evaluator scores are a separate quality signal.
They are adjacent in the Product Owner view, but no approved joining rule,
feedback timestamp, or shared population exists. The proposal makes that gap
visible instead of inferring a relationship from two displayed values.

**What is needed to display live data**
An approved feedback encoding and effective-feedback rule; feedback key and
timestamp; a privacy-preserving request/response join; an evaluation key and
timestamp; a shared eligible population; and a client-approved descriptive
analysis plan. The result must remain non-causal and use aggregates only.

**Fields needed**

| Needed field | Status in Concept | Concept comparison |
| --- | --- | --- |
| `user_feedback_score` | Existing for this metric | Listed for User Satisfaction Rate. |
| Feedback `timestamp` and `feedback_key` | Not documented | Needed for time alignment and changed-feedback deduplication; both are unresolved normalized contract fields. |
| `correlation_id` | Existing elsewhere only | Listed for User Accountability and available for cross-log joins, subject to metric-specific approval. |
| Approved request/response key | Existing elsewhere only | `request_id` is listed for Request Throughput, but not yet approved as the feedback target key. |
| Quality scores | Existing for their metrics | The five drawer signals are listed by their own quality metrics. |
| `evaluation_key`, evaluation `timestamp` | Not documented | Required to select one eligible quality record in the same analysis period. |
| `business_unit`, `project_name`, `channel` | Existing elsewhere only | Mapped elsewhere, not approved for this join. |

**Correlation needed**
Use an approved privacy-preserving key to link one effective feedback event to
its evaluated response or request; `correlation_id` may support the join but
does not prove one-to-one pairing. Then select the approved feedback-history
and evaluation-roll-up records, align timestamps, and apply filters only when
attribution works for both populations.

**Waiting for approval / confirmation**

- Feedback scale, positive/neutral/negative rule, feedback key, timestamp, and
  changed-feedback rule.
- Request/response identity, join cardinality, and retry/multiplicity treatment.
- Evaluation grain/version/population and timestamp/timezone rules.
- Shared eligibility, minimum-cohort/privacy rules, scope attribution, and
  no-data behavior.
- The permitted descriptive question and presentation. No causal effect,
  target, threshold, or user-level display is proposed.

## 5. Latency-to-quality correlation — proposed feasibility check

**Business meaning**
Would determine whether approved request-latency and quality-evaluation records
can be examined together. It does not claim that speed causes quality or that a
quality score explains latency.

**In simple terms**
We may want to check whether the same type of request has both a speed record
and a quality evaluation. We cannot do that until we know how one request maps
to one evaluation and which retries or duplicates are removed.

**Why we propose it**
P95 latency is computed from eligible requests, while evaluator scores may be
at evaluation, completion, or request grain. Adjacent placement is not evidence
that the signals describe the same population. The proposal exposes the work
needed before a comparison is considered.

**What is needed to display live data**
An approved eligible request population and canonical request key; start/end
timestamps and latency value; an approved evaluation key and timestamp;
request-to-evaluation pairing; aligned time buckets; and a descriptive,
non-causal analysis plan. P95 remains the canonical latency headline and must
not be recomputed from a different hidden population.

**Fields needed**

| Needed field | Status in Concept | Concept comparison |
| --- | --- | --- |
| `timestamp_start`, `timestamp_end`, `response_latency_ms` | Existing for this metric | Listed for End-to-End Latency. |
| Approved request key | Existing elsewhere only | `request_id` is listed for Request Throughput; the latency contract still requires an approved `request_key`. |
| `correlation_id` | Existing elsewhere only | Listed for User Accountability and available for cross-log joins, subject to metric-specific approval. |
| `completion_id` | Existing elsewhere only | Listed for Groundedness; it may link to a model invocation but is not an approved five-signal request/evaluation key. |
| Quality scores | Existing for their metrics | The five drawer signals are listed by their own quality metrics. |
| `evaluation_key`, evaluation `timestamp` | Not documented | Required to define the evaluated record and align it to the request period. |
| `business_unit`, `project_name`, `channel` | Existing elsewhere only | Mapped elsewhere, not approved for this join. |

**Correlation needed**
Pair submission and final-render events for one eligible, deduplicated request,
then join that request to the approved evaluation record. `correlation_id` or
`completion_id` can be supporting join evidence only after cardinality is
confirmed. Filter and aggregate only the population with valid latency and
quality records; label it clearly so it is not confused with the headline P95
population.

**Waiting for approval / confirmation**

- Eligible request definition, request key, and `correlation_id` event-pairing
  semantics, including retries, timeouts, and multiple final responses.
- Request-to-evaluation identity, cardinality, evaluation grain/version, and
  population rules for all included quality signals.
- Timestamp/timezone and time-alignment rules, including whether evaluation can
  occur after the request period.
- Shared eligible population, scope attribution, privacy/minimum-cohort
  constraints, and no-data behavior.
- The permitted descriptive question and presentation. No causal conclusion,
  target, or threshold is proposed.

## Excluded from this tracker

This tracker does not propose a repeated quality trend, score cards,
satisfaction/latency cards, Hallucination percentage, F1 or MLflow score,
evaluator reason, raw prompt/response, user data, model configuration,
technical diagnostic, pass-rate threshold, composite quality score, or causal
analysis.

## Quick view — required confirmations

| Proposed drawer element | Confirmation needed |
| --- | --- |
| Evaluator coverage by signal | Evaluation key, population/version, coverage threshold, deduplication, timestamp, and scope attribution. |
| Score-definition map | Intent Resolution scale/direction; record grain; valid-score, evaluator, and time rules. |
| Comparability guardrails | Cross-signal compatibility and any future composite's business definition and validation. |
| Feedback ↔ quality correlation | Feedback and request/evaluation identities, timestamps, shared population, privacy, and non-causal analysis contract. |
| Latency ↔ quality correlation | Request/evaluation pairing, eligible population, time alignment, scope attribution, and non-causal analysis contract. |
