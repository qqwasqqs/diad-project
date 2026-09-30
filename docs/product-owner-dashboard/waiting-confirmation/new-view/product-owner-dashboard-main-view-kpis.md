# Product Owner Dashboard Main View — KPIs Waiting for Client Confirmation

## Scope

This document covers only KPI metrics currently displayed in the Product Owner
dashboard main view that still need a client decision, confirmation, or missing
information before they can be treated as live, decision-ready metrics.

A KPI is included when at least one requirement for its rendered value remains
open: its business definition, calculation, counting key, time, included
population, score meaning, or connection to the dashboard filters. A KPI whose
complete display contract is established would be excluded.

Repeated displays use one definition. For example, Session & Query Volume in
the Product Experience Pulse and the Sessions/Queries chart in Adoption and
Engagement are covered together. Drawer-only proposals and mapped KPIs that do
not appear on the main view are excluded.

All values currently shown in the dashboard are illustrative. `DATA PENDING`,
`CALCULATION PENDING`, and `TEST RESULTS PENDING` do not mean zero.

### Required-field status

The field status describes the current documentation, not verified live data.

- **Yes — documented**: the field is listed for this KPI in the Product Owner
  KPI mapping.
- **Available elsewhere — confirmation needed**: the field is documented for
  another KPI or as a platform capability, but its use for this KPI is not
  approved.
- **No — not documented**: the required field or rule is not in the current KPI
  mapping.
- **Yes — canonical Splunk filter**: the field is treated as an available filter
  that Splunk applies before returning the KPI result.

### React team data-contract boundary

For the remaining unvalidated KPIs, client questions are limited to unresolved
business meaning, product scope, source-field meaning, required source
evidence, and the coverage evidence needed to interpret a result. Endpoint
property names, transport types, units, response shapes, and technical status
encoding are agreed directly by the Splunk and React teams.

Splunk performs the KPI calculation, filtering, correlation, retry handling,
and deduplication, then returns a ready-to-display aggregate. React displays
that result and its availability state; it does not calculate a KPI from raw
records.

The Required Fields tables retain the source evidence needed somewhere in the
data chain. They do not mean that every raw field must be returned to React.
Identifiers and event-level fields can remain inside Splunk when Splunk returns
a ready-to-display aggregate.

Business unit and project filters are treated as canonical inputs that Splunk
applies before returning the result. React does not join KPI records to those
fields itself.

## 1. Session & Query Volume — hierarchy validated

_Status: The conversation/session relationship is confirmed. A conversation is
the complete thread and can contain multiple sessions. A session is one period
of interaction within that conversation._

### 1. Business Meaning

Shows how much the product is used: the number of user queries, the number of
sessions, the average number of queries in a session, and the observed length
of sessions. Sessions are counted as separate periods of interaction even when
they belong to the same continuing conversation. It is an adoption and
engagement signal, not proof of satisfaction, feature adoption, workflow
completion, or business value.

### 2. Practical Interpretation

The conversation is the full thread. Each time a user enters that thread and
interacts with it, that activity belongs to a session. If the user leaves and
returns to the same thread later, the conversation stays the same but a new
session begins.

### 3. Required Fields

| Required field                               | Do we currently have it?                      | Description                                                                                                                               |
| -------------------------------------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `session_id`                                 | **Yes — documented and validated**            | Identifies one period of interaction. Multiple sessions can belong to the same conversation.                                              |
| `conversation_id`                            | **Yes — documented and validated**            | Identifies the complete conversation thread and is the parent of `session_id`.                                                            |
| `user_id`                                    | **Yes — documented**                          | A SHA-256-hashed user identifier. It may support private aggregate counting but must not be displayed.                                    |
| `timestamp_start`                            | **Yes — documented**                          | The time at which the user submits a request. The first and last values in a session are currently proposed as the observed session span. |
| Canonical `query_key`                        | **No — not documented**                       | A stable identifier that says which logged records represent one user-submitted query.                                                    |
| `request_id` as the query key                | **Available elsewhere — confirmation needed** | Documented as a unique request identifier for Request Throughput, but not approved as the query identifier for this KPI.                  |
| `timestamp_end`                              | **Available elsewhere — confirmation needed** | Documented as the end of one rendered response for End-to-End Latency. It is not defined as the end of a session.                         |
| Session end timestamp or session-close event | **No — not documented**                       | An explicit event or time that says a session has ended.                                                                                  |
| `correlation_id`                             | **Available elsewhere — confirmation needed** | Available across component logs for joining related events. It does not by itself define a query, conversation, or session.               |
| `business_unit`, `project_name`              | **Yes — canonical Splunk filters**            | Splunk applies these filters before returning the KPI result; React does not join them.                                                    |

### 4. Client Questions

_No client questions remain for this KPI._

## 2. API Error Rate — classification and denominator pending

_Status: API Error Rate replaces User Satisfaction Rate in Product Experience
Pulse. The implemented `1.14%`, `114` error requests, and `10,000` eligible
requests are illustrative. Source outcome fields and a high-level error-rate
formula are documented, but the approved counting grain, error classification,
eligible denominator, metric timestamp, and selected-scope attribution remain
open. Live data must remain `CALCULATION_PENDING` until those rules are
confirmed._

### 1. Business Meaning

Would show the percentage of eligible distinct user requests whose approved
final outcome is an API error in the selected period and scope. It is a
reliability signal, not a root-cause diagnosis, satisfaction measure, workflow
completion rate, or statement that every failed component call reached a user.

### 2. Practical Interpretation

This would tell the Product Owner how often eligible requests ended in an
approved error outcome. Before the percentage can be treated as live, we need
to agree what one counted request is, which outcomes count as errors, and which
outcomes belong in the total.

### Proposed Aggregation — approval pending

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

This formula is a proposal, not an approved live calculation. If the eligible
request count is zero, the result is `NO_DATA`, not `0%`.

### 3. Required Fields

| Required field or rule | Do we currently have it? | Description |
| --- | --- | --- |
| `response_status` | **Yes — documented, classification needs confirmation** | Documented values are `success`, `error`, `timeout`, and `content_filtered`; the approved numerator and denominator treatment is not defined. |
| `status_code` | **Yes — documented, classification needs confirmation** | HTTP response status recorded for API calls. The approved treatment of `4xx`, `5xx`, and `429` outcomes is open. |
| `error_code (API)` | **Yes — documented, classification needs confirmation** | Structured API error evidence. It may support classification but must not cause one request to be counted twice. |
| `error_message (API)` | **Yes — documented, diagnostic only** | Root-cause detail for internal investigation. It must not be returned to or displayed on the Product Owner dashboard. |
| `request_id` | **Available elsewhere — confirmation needed** | Documented as one user query for Request Throughput. Its use as the API Error Rate counting grain is not yet approved. |
| Request/event `timestamp` | **Available elsewhere — confirmation needed** | Documented for Request Throughput, but the event that places one final API outcome in the selected period is not approved. |
| `correlation_id` | **Available elsewhere — confirmation needed** | Available for joining related component logs when an outcome record does not directly carry the approved request key. |
| Final-outcome and eligible-denominator rule | **No — not documented** | Defines which outcome represents one request and which outcomes enter the numerator and denominator. |
| `business_unit`, `project_name` | **Yes — canonical Splunk filters** | Splunk applies these filters before calculating the aggregate; React does not join records to them. |

### 4. Client Questions

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

## 3. End-to-End Latency

_Status: The source mapping supports average or P95 latency. Showing P95 on the
main view is a proposal that needs confirmation._

### 1. Business Meaning

Shows how long eligible user requests take from submission until the final
response is rendered. The proposed P95 view shows the time within which 95% of
eligible requests completed, making slower user experiences more visible than
a simple average would.

### 2. Practical Interpretation

This tells us how long users wait for a complete answer. P95 focuses on the
slower experiences: if P95 is 1.20 seconds, 95 out of 100 included requests
finished in 1.20 seconds or less.

### 3. Required Fields

| Required field                             | Do we currently have it?                      | Description                                                                                                                                                |
| ------------------------------------------ | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `timestamp_start`                          | **Yes — documented**                          | The time when the user submits the request.                                                                                                                |
| `timestamp_end`                            | **Yes — documented**                          | The time when the final response is received and rendered.                                                                                                 |
| `response_latency_ms`                      | **Yes — documented**                          | The request duration in milliseconds, calculated from the response and submission times.                                                                   |
| Canonical request key                      | **Available elsewhere — confirmation needed** | `request_id` exists for Request Throughput, but it is not approved as the unique request key for latency.                                                  |
| `correlation_id`                           | **Available elsewhere — confirmation needed** | Can join the start and end events across components, but retry and multiple-response behaviour is not defined.                                             |
| Request outcome                            | **Available elsewhere — confirmation needed** | Other mappings contain status fields, but no approved latency outcome says how failures, cancellations, timeouts, or filtered responses should be handled. |
| `business_unit`, `project_name` | **Yes — canonical Splunk filters** | Splunk applies these filters before returning the latency result; React does not join them. |

### 4. Client Questions

_No client questions remain for this KPI._

## 4. Workflow Completion — proposal approval pending

_Status: This KPI is entirely a proposal and has no direct basis in the current
client documentation. `correlation_id` connects related events within the same
observed journey or session, which suggests that a completion metric might be
possible, but it does not define a workflow or a successful completion. Wait
for the client to approve the general idea before asking detailed questions or
defining a Splunk contract._

### 1. Business Meaning

The proposal would show the percentage of eligible product journeys that reach
a completed outcome. This business meaning has not been supplied or approved
by the client.

### 2. Practical Interpretation

The related events connected by `correlation_id` may allow us to follow an
observed journey from start to finish. That makes Workflow Completion a
possible future KPI, not a documented requirement. The first step is simply to
learn whether the client wants this idea included.

### 3. Required Fields

| Required field                                              | Do we currently have it?                         | Description                                                                                                                                      |
| ----------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Workflow identifier                                         | **No — proposal only**                           | A possible future key for grouping one journey. The client documentation does not define one.                                                    |
| Workflow type                                               | **No — proposal only**                           | A possible future way to distinguish journeys if the client confirms that multiple workflows exist. No workflow types are currently documented. |
| Workflow start event and timestamp                          | **No — proposal only**                           | A possible future definition of where an approved workflow begins.                                                                               |
| Workflow completion event, outcome, and timestamp           | **No — proposal only**                           | A possible future definition of a successful workflow ending.                                                                                    |
| Cancellation, abandonment, retry, and partial-success state | **No — proposal only**                           | Possible future lifecycle rules if the KPI proposal is accepted.                                                                                 |
| `correlation_id`                                            | **Yes — documented supporting evidence**         | Connects multiple related events within the same observed journey or session. It supports the proposal but does not define workflow completion.  |
| `business_unit`, `project_name`                             | **Yes — canonical Splunk filters**               | Available filters, but no Workflow Completion calculation is approved for Splunk to apply them to.                                               |

### 4. Client Questions

_No client questions at this stage. Wait for general confirmation that the
client wants this proposed KPI before asking for definitions or details._

## 5. Groundedness

_Status: The score, result, and 1–5 scale are documented, but the evaluation
population, timing, and one-record rule still need confirmation._

### 1. Business Meaning

Shows how well an evaluated answer is supported by the context supplied to the
AI. It is a response-quality signal; it is not a complete factual-accuracy
check and it is not, by itself, a hallucination rate.

### 2. Practical Interpretation

This checks whether the answer can be backed up by the information the AI was
given. A strong score does not prove that every statement is true outside that
information.

### 3. Required Fields

| Required field                             | Do we currently have it?                         | Description                                                                                                              |
| ------------------------------------------ | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| `groundedness_score`                       | **Yes — documented**                             | A 1–5 score describing how well the answer is supported by its context.                                                  |
| `groundedness_result`                      | **Yes — documented**                             | A pass/fail result based on a configured threshold. The threshold is not approved for the Product Owner view.            |
| `evaluation_run_id`                        | **Yes — documented, purpose needs confirmation** | Groups evaluator scores from one evaluation run; it may not identify one evaluated answer.                               |
| `completion_id`                            | **Yes — documented, purpose needs confirmation** | Links the result to a model response, but its use as the dashboard counting key is not approved.                         |
| `finish_reason`                            | **Yes — documented**                             | Says why the model response stopped, such as normal completion, length, or content filtering.                            |
| Evaluation timestamp                       | **No — not documented**                          | Places the evaluation in the selected period and supports freshness checks.                                              |
| Evaluator version and evaluation type      | **No — not documented**                          | Identifies which evaluator produced the score and whether the result came from real use, offline evaluation, or testing. |
| `business_unit`, `project_name` | **Yes — canonical Splunk filters** | Splunk applies these filters before returning Groundedness; React does not join them. |

### 4. Client Questions

- Will Splunk return daily Groundedness averages or individual evaluation
  records?
- What will the series ID be: `groundedness` or another value?
- Are Groundedness values always numbers from 1 to 5, with 5 meaning better?
- Will each chart point use the shape `{ "x": date, "y": score }`?
- What date format will `x` use, and will it already reflect the requested time
  zone?
- Will Splunk return a point with `y: null`, omit the point, or return zero when
  a day has no Groundedness score?
- Will the series have its own status when Groundedness data is unavailable but
  the other quality series are available?
- Will the response say whether the values come from real activity, offline
  evaluation, or tests?
- Will it include the evaluator version used for the returned averages?
- Will it include coverage counts for each point or for the full period?
- Will repeated evaluations already be combined or removed by Splunk?
- Should React round the score, or will Splunk return the final display
  precision?

## 6. Relevance Quality

_Status: The score, result, calculation, and 1–5 scale are documented, but the
evaluation population and time/filter fields are not._

### 1. Business Meaning

Shows how well an evaluated response addresses the user's question. It measures
response relevance, not whether the retrieved source documents were good or
whether the user completed a task.

### 2. Practical Interpretation

This checks whether the answer stayed focused on what the person asked, rather
than giving unrelated or unhelpful information.

### 3. Required Fields

| Required field                             | Do we currently have it?                      | Description                                                                                |
| ------------------------------------------ | --------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `relevance_score`                          | **Yes — documented**                          | A 1–5 score describing how well the response addresses the query.                          |
| `relevance_result`                         | **Yes — documented**                          | A pass/fail result based on a threshold that is not yet approved for this view.            |
| Evaluation key                             | **No — not documented**                       | Identifies one evaluated answer so repeated results are not counted more than intended.    |
| Evaluation timestamp                       | **No — not documented**                       | Places the score in the selected period and supports daily trend points.                   |
| Evaluator version and evaluation type      | **No — not documented**                       | Distinguishes evaluator versions and real-use, offline, and test results.                  |
| Response or request key                    | **Available elsewhere — confirmation needed** | Needed if the evaluation must be connected to the answer that was shown to the user.       |
| `business_unit`, `project_name` | **Yes — canonical Splunk filters** | Splunk applies these filters before returning Relevance Quality; React does not join them. |

### 4. Client Questions

- Will Splunk return daily Relevance Quality averages or individual evaluation
  records?
- What will the series ID be: `relevance-quality` or another value?
- Are Relevance Quality values always numbers from 1 to 5, with 5 meaning
  better?
- Is the returned value an average score, a pass percentage, or another
  calculation?
- Will each chart point use the shape `{ "x": date, "y": score }`?
- What date format will `x` use, and will it already reflect the requested time
  zone?
- When a day has no value, will Splunk omit the point, return `y: null`, or
  return a `NO_DATA` status?
- Will the series have its own status when only Relevance Quality is
  unavailable?
- Will the response identify the evaluation type and evaluator version behind
  the values?
- Will it include coverage counts for each point or for the full period?
- Will repeated evaluations already be combined or removed by Splunk?
- Should React round the score, or will Splunk return the final display
  precision?

## 7. Intent Resolution

_Status: The average-score formula exists, but the approved main-view
specification still treats the displayed scale and direction as unresolved._

### 1. Business Meaning

Shows how accurately the system understood and addressed the user's intended
goal. It is a quality evaluation, not proof that the user completed the full
workflow.

### 2. Practical Interpretation

This checks whether the product understood what the person was trying to do.
Understanding the request is useful, but it does not mean the person's task was
finished.

### 3. Required Fields

| Required field                             | Do we currently have it?                                 | Description                                                                                                                             |
| ------------------------------------------ | -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `intent_resolution_score`                  | **Yes — documented, display meaning needs confirmation** | A score described in the field mapping as 1–5, although the current main-view specification still marks scale and direction as pending. |
| `intent_resolution_result`                 | **Yes — documented**                                     | A pass/fail result. The Product Owner meaning of pass/fail is not approved.                                                             |
| Evaluation key                             | **No — not documented**                                  | Identifies one evaluated answer, query, or intent.                                                                                      |
| Evaluation timestamp                       | **No — not documented**                                  | Places the result in the selected period and daily trend.                                                                               |
| Evaluator version and evaluation type      | **No — not documented**                                  | Says which evaluator produced the score and whether it came from real use or testing.                                                   |
| Expected intent or approved comparison     | **No — not documented**                                  | Describes what the evaluator uses to decide whether the user's intent was understood.                                                   |
| `business_unit`, `project_name` | **Yes — canonical Splunk filters** | Splunk applies these filters before returning Intent Resolution; React does not join them. |

### 4. Client Questions

- Will Splunk return daily Intent Resolution averages or individual evaluation
  records?
- What will the series ID be: `intent-resolution` or another value?
- Is the returned score always a number from 1 to 5?
- Does a higher returned value always mean a better result?
- Is the returned value an average score, a pass percentage, or another
  calculation?
- May React plot this value on the same 1–5 axis as Groundedness and Relevance
  Quality without converting it?
- Will each chart point use the shape `{ "x": date, "y": score }`?
- What date format will `x` use, and will it already reflect the requested time
  zone?
- When a day has no value, will Splunk omit the point, return `y: null`, or
  return a `NO_DATA` status?
- Will the response identify the evaluation type and evaluator version behind
  the values?
- Will it include coverage counts for each point or for the full period?
- Will repeated evaluations already be combined or removed by Splunk?
- Should React round the score, or will Splunk return the final display
  precision?

## 8. Retrieval Quality

_Status: The 1–5 score and average calculation are documented, but the unit
being scored and the evaluation population need confirmation._

### 1. Business Meaning

Shows the evaluated relevance and ranking quality of the documents or chunks
retrieved to help produce an answer. It measures the retrieval step, not the
quality of the final answer itself.

### 2. Practical Interpretation

This checks whether the product found useful source information before writing
the answer. Good source material can help, but it does not guarantee a good
final answer.

### 3. Required Fields

| Required field                             | Do we currently have it?           | Description                                                                                |
| ------------------------------------------ | ---------------------------------- | ------------------------------------------------------------------------------------------ |
| `retrieval_score`                          | **Yes — documented**               | A 1–5 score for the relevance and ranking quality of retrieved information.                |
| `retrieval_result`                         | **Yes — documented**               | A pass/fail result based on a threshold that is not approved for this view.                |
| `retrieved_doc_ids`                        | **Yes — documented**               | Identifies the documents returned by search; used for internal lineage, not display.       |
| `dataset_version`                          | **Yes — documented**               | Identifies the search index or dataset version used for retrieval.                         |
| `result_count`                             | **Yes — documented**               | The number of documents returned; zero can indicate a retrieval failure.                   |
| `search_query_hash`                        | **Yes — documented**               | A privacy-preserving hash of the search query.                                             |
| `top_k`                                    | **Yes — documented**               | The number of source chunks requested.                                                     |
| Evaluation key and timestamp               | **No — not documented**            | Identify one scored retrieval and place it in the selected period.                         |
| Evaluator version and evaluation type      | **No — not documented**            | Distinguishes comparable evaluation methods and real-use or test populations.              |
| `business_unit`, `project_name` | **Yes — canonical Splunk filters** | Splunk applies these filters before returning Retrieval Quality; React does not join them. |

### 4. Client Questions

- Will Splunk return one calculated Retrieval Quality value for the selected
  period, or individual retrieval records?
- Will this value appear in `supportingStats` with
  `metricId: "retrieval-quality"`?
- What is the exact field name for the numeric value?
- Is the returned value an average score, a pass percentage, or another
  calculation?
- Is the value always a number from 1 to 5, with 5 meaning better?
- Will the response include `scaleMax: 5`, or should React treat 5 as fixed?
- Will Splunk return the number of retrievals behind the score?
- Will the response identify the dataset or search-index version represented by
  the score?
- If different versions are included, will the response say so?
- Will a missing value use `status: "NO_DATA"` with `value: null`?
- Will a non-`OK` response include a readable `reason`?
- Should React round the value to one decimal place, or will Splunk return the
  final display precision?

## 9. Task Adherence

_Status: The 1–5 score and average calculation are documented, but the task
unit, evaluator population, and live coverage need confirmation._

### 1. Business Meaning

Shows how well an evaluated AI response or agent action follows the system's
instructions. It is an evaluator score and must not be used as a substitute for
Workflow Completion.

### 2. Practical Interpretation

This checks whether the AI followed the rules and instructions it was given.
It does not tell us whether the user finished the job they came to do.

### 3. Required Fields

| Required field                             | Do we currently have it?           | Description                                                                             |
| ------------------------------------------ | ---------------------------------- | --------------------------------------------------------------------------------------- |
| `task_adherence_score`                     | **Yes — documented**               | A 1–5 score describing compliance with system instructions.                             |
| `task_adherence_result`                    | **Yes — documented**               | A pass/fail result based on a threshold that is not approved for this view.             |
| Evaluation key                             | **No — not documented**            | Identifies the response, action, or task being evaluated.                               |
| Evaluation timestamp                       | **No — not documented**            | Places the evaluation in the selected reporting period.                                 |
| Evaluator version and evaluation type      | **No — not documented**            | Identifies the evaluation method and whether the result came from real use or testing.  |
| Task or instruction version                | **No — not documented**            | Identifies the instructions against which adherence was judged.                         |
| `business_unit`, `project_name` | **Yes — canonical Splunk filters** | Splunk applies these filters before returning Task Adherence; React does not join them. |

### 4. Client Questions

- Will Splunk return one calculated Task Adherence value for the selected
  period, or individual evaluation records?
- Will this value appear in `supportingStats` with
  `metricId: "task-adherence"`?
- What is the exact field name for the numeric value?
- Is the returned value an average score, a pass percentage, or another
  calculation?
- Is the value always a number from 1 to 5, with 5 meaning better?
- Will the response include `scaleMax: 5`, or should React treat 5 as fixed?
- Will Splunk identify the evaluator version and instruction version represented
  by the score?
- Will Splunk return the number of evaluations behind the score?
- Will repeated evaluations already be combined or removed by Splunk?
- Will a missing value use `status: "NO_DATA"` with `value: null`?
- Will a non-`OK` response include a readable `reason`?
- Should React round the value to one decimal place, or will Splunk return the
  final display precision?

## 10. Safety Evaluators

_Status: Category-level safety fields exist, but combining them into one
Product Owner KPI is a proposal with no approved calculation._

### 1. Business Meaning

Would summarize evaluated content-safety evidence for hate or unfairness,
violence, sexual content, and self-harm. The current `CALCULATION PENDING`
state means no single aggregate is approved; it is not a statement that the
product is safe or that no safety events occurred.

### 2. Practical Interpretation

We have several separate safety checks, but we have not agreed how to turn them
into one useful dashboard result. Until we do, one combined number could be
misleading.

### 3. Required Fields

| Required field                             | Do we currently have it?                      | Description                                                                                                     |
| ------------------------------------------ | --------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Hate/unfairness score and result           | **Yes — documented**                          | A 0–7 severity score and pass/fail result for hate or unfairness.                                               |
| Violence score and result                  | **Yes — documented**                          | A 0–7 severity score and pass/fail result for violence. The mapping gives an example failure rule above 3.      |
| Sexual-content score and result            | **Yes — documented**                          | A 0–7 severity score and pass/fail result for sexual content.                                                   |
| Self-harm score and result                 | **Yes — documented**                          | A 0–7 severity score and pass/fail result for self-harm content.                                                |
| Category reason fields                     | **Yes — documented**                          | Evaluator explanations for internal review. They must not be displayed on the Product Owner main view.          |
| Request or evaluation key                  | **Available elsewhere — confirmation needed** | `request_id` exists elsewhere, but no approved key says which category results belong to one evaluated request. |
| Evaluation timestamp, version, and type    | **No — not documented**                       | Needed for the reporting period and to separate real-use, offline, and test results.                            |
| `guardrail_triggered`                      | **No — not documented**                       | Referenced by an alternative percentage proposal but absent from the KPI field mapping.                         |
| `business_unit`, `project_name` | **Yes — canonical Splunk filters** | Splunk applies these filters before returning the Safety Evaluators result; React does not join them. |

### 4. Client Questions

- Until an aggregate is available, will Splunk return
  `status: "CALCULATION_PENDING"`, `value: null`, and a readable `reason`?
- Will `safety-evaluators` be the permanent metric ID?
- When values become available, will Splunk return one combined metric or one
  metric for each safety category?
- If categories are returned separately, will each item contain a stable
  category ID, display label, numeric value, and status?
- Will category values use the 0–7 severity scale, a failure percentage, or
  another unit?
- Will the response include the scale and whether higher or lower is better?
- If Splunk returns one combined percentage, what will its exact field name be?
- Will a percentage be returned as `12`, meaning 12%, or as `0.12`?
- Will the response include the number of evaluated and affected requests
  behind the value?
- How will the payload show that one or more category results were missing?
- Will evaluator explanations and other sensitive details be excluded from the
  React response?
- Should Splunk return the display limits, or are they fixed in the UI?

## 11. MLflow Safety Score

_Status: The source field, average calculation, and 0–1 field description are
documented, but the wider documentation contains a scale conflict and no
approved direction or decision threshold._

### 1. Business Meaning

Shows the average MLflow safety-evaluator rating for an approved set of
evaluations. It is an evaluator signal, not a safety verdict, security incident
rate, satisfaction score, or release decision.

### 2. Practical Interpretation

This is an average score from an automated safety check. Before using it, we
need to confirm what the scale means, which evaluations go into the average,
and whether a high number is good.

### 3. Required Fields

| Required field                              | Do we currently have it?                             | Description                                                                                                |
| ------------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `response/llm_judged/safety/rating/average` | **Yes — documented, scale needs final confirmation** | An MLflow safety rating described as a number from 0 to 1. Another document contains a five-point example. |
| Request or evaluation key                   | **No — not documented for this KPI**                 | Identifies one evaluated response and prevents repeated results from being counted incorrectly.            |
| Model key or model version                  | **Available elsewhere — confirmation needed**        | Model fields exist in governance mappings, but the approved connection to this KPI is not defined.         |
| Evaluation timestamp                        | **No — not documented**                              | Places the rating in the selected period and supports freshness checks.                                    |
| Evaluator version and evaluation type       | **No — not documented**                              | Identifies the evaluator and separates real-use, offline, and test results.                                |
| `business_unit`, `project_name` | **Yes — canonical Splunk filters** | Splunk applies these filters before returning the MLflow Safety Score; React does not join them. |

### 4. Client Questions

- Will Splunk return one calculated MLflow Safety Score or individual rating
  records?
- Will the metric use `metricId: "mlflow-safety-score"`?
- Will the numeric value be returned as `value.score`, or under another field
  name?
- Is the returned score always on a 0–1 scale?
- Will the response include `scaleMax: 1` so React does not have to assume the
  scale?
- Does a higher returned score always mean a better safety result?
- Will the response identify the evaluator version and whether the score comes
  from real activity or tests?
- Will it include the number of evaluations behind the average?
- Will repeated evaluations and multiple model calls already be combined by
  Splunk?
- When no score is available, will Splunk return `NO_DATA`, `DATA_PENDING`, or
  another status?
- Will a non-`OK` response use `value: null` and include a readable `reason`?
- Should React round the value to two decimal places, or will Splunk return the
  final display precision?
- Should Splunk return the good/attention/poor limits, or are they fixed in the
  UI?

## 12. PII Leakage (Agent Only)

_Status: A source field is mapped, but its data type, meaning, availability,
agent coverage, and percentage calculation are not confirmed. The main view
correctly shows `DATA PENDING`._

### 1. Business Meaning

Would show potential sensitive-data leakage flagged by the evaluator for
supported agent requests. It is an evaluator result, not proof of a confirmed
data breach or a guarantee that unflagged requests contain no sensitive data.

### 2. Practical Interpretation

This would tell us how often an automated check thinks an agent may have
revealed sensitive information. We first need to know which agents the check
supports and exactly what its result means.

### 3. Required Fields

| Required field                             | Do we currently have it?                         | Description                                                                                                                                       |
| ------------------------------------------ | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Sensitive_data_leakage`                   | **Yes — documented, meaning needs confirmation** | Described as a pass/fail indicator or score. Its exact type and which value means possible leakage are not defined.                               |
| Agent identifier and version               | **Available elsewhere — confirmation needed**    | Agent fields exist in other mappings but are not approved here; they are needed to prove that a request is supported by the agent-only evaluator. |
| Request or evaluation key                  | **Available elsewhere — confirmation needed**    | `request_id` exists elsewhere, but no approved key groups repeated evaluator results for this KPI.                                                |
| Evaluation timestamp                       | **No — not documented**                          | Places the result in the selected period.                                                                                                         |
| Evaluation type or environment             | **Available elsewhere — confirmation needed**    | Environment is documented elsewhere, but there is no approved rule separating real-use monitoring from offline or red-team tests.                 |
| Supported/evaluated marker                 | **No — not documented**                          | Distinguishes requests that were checked from requests for which the evaluator was unavailable or not applicable.                                 |
| `business_unit`, `project_name` | **Yes — canonical Splunk filters** | Splunk applies these filters before returning the PII Leakage result; React does not join them. |

### 4. Client Questions

- Until the metric is available, will Splunk return
  `status: "DATA_PENDING"`, `value: null`, and a readable `reason`?
- Will `pii-leakage-agent-only` be the permanent metric ID?
- When data becomes available, will Splunk return one calculated percentage or
  individual evaluator records?
- If individual records are returned, what data type and values can
  `Sensitive_data_leakage` contain?
- Which returned value means possible leakage was found?
- If an aggregate is returned, what will the numeric field be called?
- Will a percentage be returned as `2`, meaning 2%, or as `0.02`?
- Will the response include the number of evaluated and flagged agent requests
  behind the percentage?
- Will the payload identify the supported agent scope or evaluator version?
- How will Splunk distinguish no flagged leakage from an evaluator that did not
  run or does not support the selected scope?
- Will repeated evaluator results already be combined or removed by Splunk?
- Will a non-`OK` response always include a readable `reason`?
- Should Splunk return the attention limit, or is it fixed in the UI?

## 13. User Prompt Injected Attacks (UPIA)

_Status: Evaluator outcome fields and a high-level defect-rate formula are
mapped, but the test identity, success rule, and eligible test population are
missing. The main view correctly shows `TEST RESULTS PENDING`._

### 1. Business Meaning

Would show the percentage of approved prompt-injection test cases that
successfully manipulated the system. It is a security-test result, not an
ordinary production error rate or proof that no real-world attack occurred.

### 2. Practical Interpretation

This tests whether harmful instructions hidden in content can trick the
product. We cannot show a trustworthy percentage until we agree what one test
is and what counts as the product being tricked.

### 3. Required Fields

| Required field                             | Do we currently have it?                               | Description                                                                                       |
| ------------------------------------------ | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| `indirect_attack`                          | **Yes — documented, value meaning needs confirmation** | Indicates whether a response fell for an indirect prompt injection.                               |
| `xpia_manipulated_content`                 | **Yes — documented, value meaning needs confirmation** | Indicates an attempt to alter or fabricate contextual information.                                |
| `xpia_intrusion`                           | **Yes — documented, value meaning needs confirmation** | Indicates an attempt at unauthorized access or privilege escalation.                              |
| `xpia_information_gathering`               | **Yes — documented, value meaning needs confirmation** | Indicates an attempt to extract sensitive information.                                            |
| Test-case key                              | **No — not documented**                                | Identifies one unique security test so reruns and retries are handled correctly.                  |
| Overall success/failure rule               | **No — not documented**                                | Says how the four fields combine to determine whether one attack test succeeded.                  |
| Test timestamp                             | **No — not documented**                                | Places the result in the selected period and supports freshness reporting.                        |
| Test set, version, and environment         | **No — not documented**                                | Identifies the approved group of tests and separates test, red-team, and any production evidence. |
| `business_unit`, `project_name` | **Yes — canonical Splunk filters** | Splunk applies these filters before returning the UPIA result; React does not join them. |

### 4. Client Questions

- While results are pending, will Splunk return
  `status: "CALCULATION_PENDING"`, `value: null`, and a readable `reason`?
- Should React display `TEST RESULTS PENDING` when the returned status is
  `CALCULATION_PENDING`, or will Splunk return a separate status for that label?
- Will `upia` be the permanent metric ID?
- When the metric becomes available, will Splunk return one calculated defect
  percentage or individual test records?
- If individual records are returned, what data type and values can
  `indirect_attack`, `xpia_manipulated_content`, `xpia_intrusion`, and
  `xpia_information_gathering` contain?
- If an aggregate is returned, what will the percentage field be called?
- Will the percentage be returned as `4`, meaning 4%, or as `0.04`?
- Will the response include the number of successful and total test cases
  behind the percentage?
- Will the response include a test-set ID, version, and result date?
- Will repeated test runs already be combined or removed by Splunk?
- How will Splunk distinguish no successful attacks, no test results,
  calculation pending, and an error?
- Will a non-`OK` response always include a readable `reason`?
- Should Splunk return the attention limit, or is it fixed in the UI?

## Excluded from this document

- Dashboard filters, the illustrative-values banner, and section titles are not
  KPI metrics.
- Adoption and Engagement is not treated as a separate KPI; its Sessions,
  Queries, queries-per-session, and average-session-duration displays are part
  of Session & Query Volume.
- Repeated uses of the same KPI are documented once.
- User Satisfaction Rate remains in the Product Owner source inventory but is
  not currently rendered on the main view; its future presentation is outside
  this document.
- Drawer-only measures such as Session Depth Distribution and Conversations per
  Session are not part of the main view.
- Hallucination percentage is not displayed; the main view displays
  Groundedness only.
- Product Owner mapping rows that are not rendered by
  `app/home/product-owner-dashboard/page.tsx` are outside this document.
