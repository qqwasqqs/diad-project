# Adoption and Engagement Drawer — Waiting for Confirmation

## Scope

This tracker covers only elements currently displayed in the **Adoption and
Engagement** main-view section or its **Engagement patterns** detail drawer for
which data coverage, a definition, or an approval is still missing. It does not
list elements whose display contract is already clear, and it does not turn a
pending state into a zero value.

The drawer's distributions, proposed aggregation, and coverage states are
illustrative until the listed confirmations are complete.

## Confirmed platform capability

Every application and component will emit a `correlation_id` in its logs. This
tracker treats it as an available cross-log join field and never as a display
field. It can connect related emitted events, but it does **not** itself define
a unique query, session, or conversation. Those identities and their
aggregation rules still require the confirmations below.

### Field-status legend

The statuses below compare the required field with the Concept's documented
**Key fields** inventory. They do not confirm live telemetry or an API response.

- **Existing for this metric** — listed for Session & Query Volume in the
  Concept.
- **Existing elsewhere only** — present in another Concept metric, but not
  supplied or approved for this engagement calculation.
- **Not documented** — absent from the Concept's field inventory for the
  required purpose.

## 1. Session Depth Distribution — measurement coverage pending

**Business meaning**
Shows how many approved user queries occur within each observed session, using
the displayed bands `1`, `2–3`, `4–6`, and `7+`. It helps distinguish shallow
from more sustained observed engagement. It does not prove feature adoption,
satisfaction, workflow completion, or business value.

**In simple terms**
We want to see whether people usually ask one question or continue with several
questions in the same visit. Before we trust the distribution, we need to agree
what counts as one query and make sure duplicate logs are not counted twice.

**What is needed to display live data**
An approved unique query identity, valid session assignment, retry and
deduplication rules, a selected-scope population, and approved band boundaries.
The drawer groups only eligible, deduplicated user queries per session.

**Fields needed**

| Needed field | Status in Concept | Concept comparison |
| --- | --- | --- |
| `session_id` | Existing for this metric | Listed for Session & Query Volume. |
| `query_key` | Not documented | No canonical query-key field is listed in the Concept. |
| `request_id` | Existing elsewhere only | Listed for Request Throughput, not Session & Query Volume; it is not yet approved as the query key. |
| `timestamp_start` | Existing for this metric | Listed for Session & Query Volume; needed for the selected period. |
| `channel` | Existing for this metric | Listed for Session & Query Volume; selected-scope attribution still needs confirmation. |
| `correlation_id` | Existing elsewhere only | Listed for User Accountability, not Session & Query Volume; the platform-wide logging decision makes it available for joins, subject to metric-specific approval. |

**Correlation needed**
Associate each approved query with a session through `session_id`. Use the
approved query key to identify and deduplicate query events; use
`correlation_id` only to connect related component logs when necessary. Apply
business-unit, project, and channel filters only when the session population
can be attributed reliably.

**Client Questions**

- What exactly counts as one user query?
- Can `request_id` be used to identify one query?
- If the system retries the same query, should it still count only once?
- Should failed or abandoned queries be included?
- What tells us that a session starts and ends?
- If a session continues after midnight, should it remain one session?
- Are `1`, `2–3`, `4–6`, and `7+` the right groups for the number of queries in
  a session?
- If a query or session is missing an ID, should it be left out or shown as
  missing coverage?
- Can these sessions be connected to the selected business unit, project, and
  channel?

## 2. Conversation Pattern — proposed aggregation pending

**Business meaning**
Shows the proposed number of distinct conversations per observed session. It
adds a view of whether a session contains one or several conversation threads.
It is not a confirmed measure of task completion, user satisfaction, or feature
adoption.

**In simple terms**
We want to know whether a visit is usually one conversation or several separate
conversations. Before we use this number, we need to confirm that the system
links each conversation to the right session.

**What is needed to display live data**
A validated relationship between conversations and sessions, a decision on how
to handle a conversation spanning sessions, and an approved aggregation rule
for distinct conversations per distinct session.

**Fields needed**

| Needed field | Status in Concept | Concept comparison |
| --- | --- | --- |
| `conversation_id` | Existing for this metric | Listed for Session & Query Volume. |
| `session_id` | Existing for this metric | Listed for Session & Query Volume. |
| `timestamp_start` | Existing for this metric | Listed for Session & Query Volume; needed for the selected period. |
| `channel` | Existing for this metric | Listed for Session & Query Volume; selected-scope attribution still needs confirmation. |
| `correlation_id` | Existing elsewhere only | Listed for User Accountability, not Session & Query Volume; the platform-wide logging decision makes it available for joins, subject to metric-specific approval. |
| `business_unit` | Existing elsewhere only | Listed for Business Ownership, not Conversation Pattern attribution. |
| `project_name` | Existing elsewhere only | Listed for Business Ownership, not Conversation Pattern attribution. |

**Correlation needed**
Group each `conversation_id` under an approved `session_id`, using
`correlation_id` to join related component logs only when the relationship is
not available in one UI event. Confirm whether a conversation may continue
across sessions and how it is counted only once.

**Client Questions**

- Is the session ID the same as the conversation ID?
- If they are not the same, what does a session mean and what does a
  conversation mean?
- Which is the larger group: does a session contain conversations, or does a
  conversation contain sessions?
- Can one session contain more than one conversation?
- Can one conversation continue across more than one session?
- What should happen when a session ID or conversation ID is missing?
- Should sessions with no valid conversation ID still be included in the
  average?
- Should the number be calculated as all conversations divided by all sessions?
- Can each conversation be connected to the selected time, business unit,
  project, and channel?

## 3. Session-Duration Distribution — measurement coverage pending

**Business meaning**
Shows how long observed sessions span, grouped into the displayed duration
bands `0–2 min`, `3–7 min`, `8–15 min`, and `16+ min`. It provides engagement
context; it does not prove attention, satisfaction, productivity, or business
value.

**In simple terms**
We want to see whether visits are very short or last longer. Before we trust
the bands, we need to agree when a session ends, especially if a user leaves,
comes back later, or submits only one query.

**What is needed to display live data**
A valid session population, a start/end or inactivity rule, timestamp coverage,
and an approved treatment for one-query sessions, cross-day sessions, and
missing timestamps. The drawer derives a session span from the earliest and
latest valid events in the session.

**Fields needed**

| Needed field | Status in Concept | Concept comparison |
| --- | --- | --- |
| `session_id` | Existing for this metric | Listed for Session & Query Volume. |
| `timestamp_start` | Existing for this metric | Listed for Session & Query Volume. |
| `timestamp_end` | Existing elsewhere only | Listed for End-to-End Latency, not as a session-end field. |
| `channel` | Existing for this metric | Listed for Session & Query Volume; selected-scope attribution still needs confirmation. |
| `correlation_id` | Existing elsewhere only | Listed for User Accountability, not Session & Query Volume; the platform-wide logging decision makes it available for joins, subject to metric-specific approval. |
| `business_unit` | Existing elsewhere only | Listed for Business Ownership, not Session Duration attribution. |
| `project_name` | Existing elsewhere only | Listed for Business Ownership, not Session Duration attribution. |

**Correlation needed**
Group timestamped events by `session_id`; use `correlation_id` only to connect
related component logs where the UI session event needs enrichment. Derive the
span from the first and last valid timestamps after applying the approved
session-end and duplicate-event rules.

**Client Questions**

- What tells us that a session has started?
- What tells us that a session has ended?
- We have `timestamp_start` for requests, but no confirmed session end time.
  Should the last request time be treated as the session end?
- Could the response `timestamp_end` be used, or does it only mark the end of
  one answer?
- Should a session end after a period with no activity? If yes, after how many
  minutes?
- What duration should a session with only one query have?
- If a user leaves and returns later, is that the same session or a new one?
- If a session continues after midnight, should it remain one session?
- Are `0–2`, `3–7`, `8–15`, and `16+` minutes the right groups?
- What should happen when a timestamp is missing or invalid?
- Can these sessions be connected to the selected business unit, project, and
  channel?

## 4. Engagement Measurement Coverage — readiness pending

**Business meaning**
Shows whether the four field families needed for the drawer—Session ID,
Conversation ID, Timestamp, and Channel—are usable for the selected scope. It
is a readiness check, not another engagement KPI and not a statement that the
coverage is zero.

**In simple terms**
Before we rely on the charts, we need to know whether we actually have the
basic ingredients for them. This panel is a checklist showing that those
ingredients still need to be checked.

**What is needed to display live data**
A defined coverage threshold, completeness and freshness checks for each field,
selected-scope attribution, and an API response that can distinguish complete,
partial, unavailable, and no-data states.

**Fields needed**

| Needed field | Status in Concept | Concept comparison |
| --- | --- | --- |
| `session_id` | Existing for this metric | Listed for Session & Query Volume. |
| `conversation_id` | Existing for this metric | Listed for Session & Query Volume. |
| `timestamp_start` | Existing for this metric | Listed for Session & Query Volume. |
| `channel` | Existing for this metric | Listed for Session & Query Volume. |
| `correlation_id` | Existing elsewhere only | Available for cross-log joins under the platform-wide logging decision, but not listed for Session & Query Volume coverage. |
| `business_unit` | Existing elsewhere only | Listed for Business Ownership, not the Engagement Coverage calculation. |
| `project_name` | Existing elsewhere only | Listed for Business Ownership, not the Engagement Coverage calculation. |

**Correlation needed**
No new business metric is calculated here. Confirm that the selected scope can
reliably connect session, conversation, timestamp, and channel values through
the approved event relationships. `correlation_id` may support cross-log
coverage checks, but it does not replace any of those four field families.

**Client Questions**

- How much of the data must contain a Session ID before we call it ready?
- Should Conversation ID, Timestamp, and Channel use the same minimum level?
- If some records have the field and others do not, should the drawer show
  “partial coverage”?
- How old can the latest data be before it is considered out of date?
- Which missing or invalid values should make a record unusable?
- How do we confirm that the session, conversation, time, and channel belong to
  the same activity?
- Must all four fields work for every selected business unit and project?
- What should the drawer show when the fields exist but cannot be connected to
  the selected filters?
- What is the difference between “no activity,” “data unavailable,” and “data
  not ready” for this drawer?

## Excluded from this tracker

This drawer intentionally does not add the main Sessions/Queries trend,
headline totals, workflow completion, satisfaction, raw user or session data,
technical diagnostics, or causal claims. Those are outside the Engagement
patterns drawer's purpose.

## Quick view — required confirmations

| Displayed element | Confirmation needed |
| --- | --- |
| Session Depth Distribution | Query identity; session population; deduplication; depth bands and selected-scope attribution. |
| Conversation Pattern | Session/conversation relationship; cross-session rule; aggregation and coverage. |
| Session-Duration Distribution | Session-end rule; timestamp coverage/timezone; duration bands and duplicate-event treatment. |
| Engagement Measurement Coverage | Coverage threshold; field completeness/freshness; selected-scope attribution and API state. |
