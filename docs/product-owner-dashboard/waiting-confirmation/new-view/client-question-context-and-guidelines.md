# Client Question Context and Authoring Guidelines

## Purpose

This document records confirmed project context and the reasoning rules to use
when writing client questions for the Product Owner dashboard. Its purpose is
to prevent implementation questions, already answered questions, and questions
with invalid premises from being sent to the client.

These rules apply to future client-question reviews for both the main view and
the drawers.

## Confirmed Delivery Architecture

### Splunk responsibilities

- Splunk performs all data processing and KPI calculations.
- Splunk handles aggregation, correlation, retry handling, duplicate removal,
  and any request-status rules that affect a KPI.
- Splunk returns processed, ready-to-display KPI data to the React application.
- When the data needed for a KPI is not available, Splunk returns
  `DATA_PENDING`.

### React responsibilities

- React displays the processed values returned by Splunk.
- React does not calculate KPI values from timestamps or raw records.
- React does not aggregate, correlate, deduplicate, or remove retries.
- React does not decide which request statuses belong in a KPI calculation.
- React does not need raw event-level data when Splunk provides the processed
  display value.

### Splunk and React team responsibilities

- Exact endpoint paths, response property names, transport encodings,
  timestamp formats, time zones, and similar contract details are agreed
  directly between the Splunk and React teams.
- These details are not client questions.
- When the current documentation already specifies a field name, type, scale,
  or relationship, that documentation is the source of truth.
- If the client's documentation gives conflicting definitions for a source
  field's values, type, scale, or meaning, resolving that conflict is a client
  question. This is different from choosing how the Splunk endpoint encodes
  the field for React.
- When the documentation does not specify a minor technical detail, the two
  implementation teams resolve it while defining the endpoint contract.

## Confirmed Identifier Relationships

### Conversation and session

- `conversation_id` is the top-level identifier for the complete conversation
  thread.
- One conversation can contain multiple sessions.
- `session_id` identifies one period of interaction within a conversation.
- When a user leaves and later returns to the same thread, the
  `conversation_id` remains the same and a new `session_id` is created.
- A session record is assumed to retain its relationship to its parent
  conversation. This follows directly from the documented hierarchy and does
  not require a client question.

### Request and query

- One `request_id` represents one user query.
- The relationship is treated as one-to-one for this project.
- This is an established identifier meaning and does not require a client
  question.

## Other Established Product Owner Context

- `channel` is not a canonical field and is absent from most applications. It
  must not be requested as a required field or used as the basis of a KPI in
  the new Product Owner documentation.
- Business unit and project remain canonical Splunk-side filters.
- User Satisfaction Rate remains a valid KPI, but it applies only to
  applications that collect feedback.
- An application that does not support feedback must not be represented as
  having zero satisfaction.
- A missing or valueless `user_feedback_score` is interpreted as meaning that
  feedback is not enabled for that application.
- User Satisfaction Rate includes only applications that provide usable
  feedback data. Applications without feedback support do not affect the
  percentage.
- No additional client-defined support status is required at this stage.
  Splunk and React will agree internally how the response distinguishes any
  technical no-feedback states.

## Ownership Test for a Client Question

| Uncertainty | Owner | Send to client? | Rule |
| --- | --- | --- | --- |
| Business meaning or product scope not established in documentation | Client | Yes | Ask only when the answer changes what the KPI means or where it applies. |
| Whether a KPI applies to all applications or only a named subset | Client | Yes | This is a product-scope decision. |
| Conflicting definitions of a client-provided source field's values, type, scale, or meaning | Client | Yes | Ask the client to resolve contradictions in its own documentation. |
| Source fields or source-record relationships needed for the KPI but omitted from the client's documentation | Client | Yes | Ask what source evidence exists without asking the client to design the React endpoint. |
| Evidence needed to communicate how representative a KPI is | Client | Yes | Confirm required coverage information when it affects how the KPI can be interpreted. |
| KPI calculation, aggregation, duplicate removal, retry handling, or status filtering | Splunk team | No | Splunk returns the processed result. |
| Source-application instrumentation behaviour | Source application or Splunk team | No | React does not need to define how the source creates telemetry. |
| Endpoint property names, transport types, timestamp format, or time zone | Splunk and React teams | No | Resolve while defining the endpoint contract. |
| React formatting or component implementation | React team | No | Do not externalize implementation choices to the client. |
| Relationship explicitly established by current documentation | Documentation | No | Use the documented relationship as the source of truth. |
| Relationship that follows necessarily from an established project hierarchy | Project team | No | Apply the relationship unless contradictory evidence exists. |
| Missing KPI data | Established contract | No | Use `DATA_PENDING`. |

## Review of the Session & Query Volume Questions

### 1. Ready-to-display result

**Reviewed question:** Will Splunk return a ready-to-display object containing
query count, session count, queries per session, and average session duration?

**Decision:** Remove it.

**Reason:** Splunk always returns processed KPI data. React only displays the
result.

### 2. Exact field names and data types

**Reviewed question:** What are the exact field names and data types for those
four values?

**Decision:** Remove it from the client questions.

**Reason:** The endpoint contract is still being developed. Existing documented
types remain authoritative; otherwise, the Splunk and React teams agree the
details directly.

### 3. Session-to-conversation linkage

**Reviewed question:** If individual records are returned, will every
`session_id` include its parent `conversation_id`?

**Decision:** Remove it.

**Reason:** Splunk returns processed data, so the raw-record premise is not
needed. The documented hierarchy also establishes that every session belongs
to its parent conversation.

### 4. Request-to-query relationship

**Reviewed question:** If individual records are returned, does one
`request_id` always represent one user query?

**Decision:** Remove it.

**Reason:** The project treats one `request_id` as one user query. This is an
established one-to-one relationship.

### 5. Retries and duplicate queries

**Reviewed question:** Will Splunk remove retries and duplicate query records
before returning the data, or must React handle them?

**Decision:** Remove it.

**Reason:** Retry handling and duplicate removal are Splunk responsibilities.
React never performs this processing.

### 6. Session-duration calculation

**Reviewed question:** Will Splunk return a calculated session duration, or
must React calculate it from timestamps?

**Decision:** Remove it.

**Reason:** Splunk performs every calculation and returns the processed session
duration. React does not calculate it.

### 7. Timestamp format and time zone

**Reviewed question:** If timestamps are returned, what format and time zone
will they use?

**Decision:** Remove it from the client questions.

**Reason:** This is a minor endpoint-contract detail for the Splunk and React
teams to agree directly. It is not the client's responsibility.

### 8. Request-status handling

**Reviewed question:** If request status affects the totals, will Splunk apply
that rule before returning the values or include a status field for React to
use?

**Decision:** Remove it.

**Reason:** Splunk applies any request-status rule as part of processing. React
receives the processed KPI value.

### 9. No valid session or query data

**Reviewed question:** Which status and value shape will Splunk return when no
valid session or query data is available?

**Decision:** The question was valid, but it is now answered and should be
removed.

**Reason:** Splunk returns `DATA_PENDING` when the KPI data is not available.
Any finer response-object detail belongs in the internal endpoint contract.

### Session & Query Volume outcome

All nine reviewed questions should be removed from the client-question list.
The business hierarchy and missing-data status are confirmed, while all
remaining implementation details belong to the Splunk and React teams.

## Review of the User Satisfaction Rate Questions

### 1. Values and type of `user_feedback_score`

**Reviewed question:** If individual records are returned, what values and
data type can `user_feedback_score` contain?

**Decision:** Keep it as a client question.

**Reason:** `user_feedback_score` is a field provided in the client's
documentation, but the documented definitions conflict. One definition uses
integer values of `0` and `1`, while another treats a score of `3` or more as
positive. The client must clarify the source field's value set, scale, and
meaning. This is not the same as asking the Splunk and React teams how to
encode the value in their endpoint contract.

### 2. Feedback source-record fields

**Reviewed question:** If individual records are returned, will each record
contain a feedback key, a timestamp, and the ID of the answer or request it
belongs to?

**Decision:** Keep it as a client question.

**Reason:** The client's documentation does not establish which source fields
exist or how a feedback record is connected to the answer or request it
evaluates. This missing source-data definition must be clarified before the
teams can rely on the evidence. The exact property names used by the
Splunk-to-React endpoint remain an internal concern.

### 3. Neutral, invalid, and missing feedback

**Reviewed question:** How will neutral, invalid, or missing feedback appear in
the response?

**Decision:** Remove it for now.

**Reason:** This is derivative of the unresolved `user_feedback_score` value
set and scale. The answer to the first question may also define which values
are positive, neutral, invalid, or missing. Asking both questions now would be
redundant. A narrower follow-up should be added only if an ambiguity remains
after the foundational field definition is confirmed.

### 4. Feedback coverage counts

**Reviewed question:** Will the response include coverage counts so React can
show what percentage of the eligible feedback the KPI represents?

**Decision:** Keep it as a client question.

**Reason:** Coverage changes how confidently the displayed percentage can be
interpreted. The client should confirm whether this supporting evidence is
required. The Splunk and React teams can then decide the exact endpoint shape
internally.

### 5. Applications that support feedback

**Reviewed question:** Will Splunk identify which applications support User
Satisfaction Rate?

**Decision:** The question was valid, but it is now answered and should be
removed.

**Reason:** A missing or valueless `user_feedback_score` is interpreted as
meaning that feedback is not enabled for the application. The technical way
Splunk communicates that result to React belongs in the internal contract.

### 6. Separate unsupported-feedback status

**Reviewed question:** Which status will identify an application that does not
track feedback?

**Decision:** Remove it.

**Reason:** No additional client-defined status is needed at this stage. The
presence of usable `user_feedback_score` data means feedback is tracked; its
absence means it is not enabled. Any response-status implementation is an
internal Splunk and React concern.

### 7. Mixed supported and unsupported applications

**Reviewed question:** If the selected scope contains both supported and
unsupported applications, will the percentage use only supported applications
and include that coverage in the response?

**Decision:** Remove it.

**Reason:** Unsupported applications have no feedback data and therefore
cannot contribute to the satisfaction percentage. Only applications with
usable feedback are included. The separate retained coverage question is
enough to establish whether the supporting counts must also be displayed.

### 8. Unsupported application versus no submitted feedback

**Reviewed question:** How will React distinguish feedback is not supported
from feedback is supported but no feedback was submitted?

**Decision:** Remove it from the client questions.

**Reason:** This distinction may matter to the UI, but how Splunk represents it
and how React renders it are internal endpoint and implementation decisions.

### 9. Splunk status when feedback data is unavailable

**Reviewed question:** Which status will Splunk return when there is no
feedback, no data, data pending, or other feedback?

**Decision:** Remove it from the client questions.

**Reason:** Response statuses are agreed by the Splunk and React teams. The
current general contract uses `DATA_PENDING` when KPI data is unavailable;
Splunk may otherwise return no data as agreed internally. The client does not
need to define the transport behavior.

### User Satisfaction Rate outcome

Retain only the questions about the conflicting `user_feedback_score`
definition, the source fields that connect feedback to an answer or request,
and whether feedback coverage counts are required. The application-support
rule is now established, derivative questions should wait for the foundational
score definition, and response-status concerns remain internal.

## Logical Patterns Derived from the Review

### 1. Do not ask questions that contradict the architecture

Do not ask whether React will calculate, aggregate, deduplicate, correlate, or
filter KPI data. React is display-only and Splunk owns those operations.

### 2. Separate source-data meaning from endpoint encoding

The meaning, allowed values, scale, and relationships of a client-provided
source field belong to the client when its documentation is missing or
contradictory. Endpoint property names, transport types, timestamp formats,
time zones, and response-object design belong to the Splunk and React teams.
Do not treat those two kinds of data-shape question as equivalent.

### 3. Treat documentation as evidence, not as another uncertainty

If the documentation defines a hierarchy, identifier meaning, type, scale, or
relationship, use it. Do not ask the client to reconfirm it without conflicting
evidence.

### 4. Apply necessary relationships consistently

If the documentation states that a session is a child of a conversation, the
data must preserve that connection. Do not ask whether the child contains its
parent identifier unless the implementation reveals contradictory evidence.

### 5. Keep project-specific identifier meanings stable

For this project, one `request_id` means one user query. Do not repeatedly ask
about its cardinality in every KPI section.

### 6. Do not send team-to-team questions to the client

The client should not be asked to choose endpoint property names, JavaScript
types, timestamp encodings, time zones, or which team performs a technical
transformation. Those details are resolved by the Splunk and React teams.

### 7. Convert confirmed answers into rules

Once an answer is known, remove the question and record the answer as confirmed
context. A waiting-for-confirmation document must not continue presenting a
settled point as unresolved.

### 8. Ask only questions the client is positioned to answer

A valid client question requires business or product knowledge and must affect
the KPI's meaning, applicability, or decision use. It should not require the
client to design telemetry or an API.

### 9. Prefer a documented default over repeated missing-state questions

The established unavailable-data state is `DATA_PENDING`. Do not ask the same
missing-state question for every KPI unless that KPI genuinely needs a
different business state, such as not applicable.

### 10. Resolve foundational definitions before derivative cases

First establish a field's valid values, scale, and meaning. Do not also ask
about every neutral, invalid, or missing case when the foundational answer is
likely to resolve them. Add a narrower follow-up only if ambiguity remains.

### 11. Do not ask the client to confirm necessary consequences

Do not ask whether an application without feedback should influence a
feedback-based percentage. It cannot contribute evidence and is necessarily
excluded. Questions based on an unavoidable consequence of the known data do
not require client confirmation.

### 12. Coverage can be a business interpretation question

Coverage counts are not merely endpoint fields when they tell the reader how
representative a KPI is. It is valid to ask the client whether that supporting
evidence is required, while leaving its property names and transport format to
the implementation teams.

### 13. Remove valid questions once they are answered

A question can be logically valid when first raised and still be removed after
the answer becomes established. Record the answer as project context so it is
applied consistently to later KPI sections.

## Client Question Checklist

Before adding a question, check all of the following:

1. Is the answer absent from the current documentation and confirmed project
   context, or is the documentation contradictory?
2. Is the uncertainty about business meaning, product scope, source-field
   meaning, source evidence, or required interpretation evidence?
3. Does the answer require knowledge or authority the client is positioned to
   provide?
4. Would the answer change the KPI's meaning, applicability, evidence, or
   permitted use?
5. Is the question independent of Splunk's responsibility to process the data?
6. Is the question independent of React implementation details?
7. Can the Splunk and React teams **not** resolve it through their endpoint
   contract?
8. Is the answer not already implied by an established hierarchy,
   relationship, field presence, or eligible population?
9. Is it a foundational question rather than a derivative question likely to
   be answered by another unresolved item?
10. Is the question still unanswered?

If any answer is **no**, the item should normally be documented as a fact,
assumption, or internal implementation task instead of a client question.

## Examples for Future Sections

### Appropriate client questions

- The documentation describes `user_feedback_score` as both `0` or `1` and as
  a scale where `3` or more is positive. Which definition should we use?
- Does the feedback source provide a feedback key, a timestamp, and the ID of
  the answer or request being evaluated?
- Should the KPI include coverage counts so readers know how much eligible
  feedback the percentage represents?
- Does this KPI apply to every application or only to applications that support
  the underlying capability?
- Which business outcome is this KPI intended to represent?
- Should an unsupported application show the KPI as not applicable, or should
  the KPI be omitted for that application?
- Is this KPI allowed to influence a product decision, or is it context only?

### Questions to keep within the project team

- What should the endpoint field be called?
- How should the endpoint encode an already-defined source value?
- Which timestamp format and time zone should the endpoint use?
- Should Splunk or React remove duplicate records?
- Should React calculate the KPI from raw events?
- Does the response use an object or an array?
- Which request statuses should React filter?
- Which endpoint status should distinguish unsupported feedback from supported
  feedback with no submissions?
