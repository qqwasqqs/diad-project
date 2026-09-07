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

**Waiting for approval / confirmation**

- Canonical query key and retry/deduplication rules.
- Which submissions belong in the eligible population, including failed or
  abandoned submissions.
- Session boundary, cross-day, and timezone rules.
- Whether the displayed depth bands are the approved business grouping.
- Business-unit, project, and channel attribution, coverage, and no-data
  behavior.

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

**Waiting for approval / confirmation**

- Session-to-conversation relationship and its cardinality.
- Treatment of conversations that cross session boundaries or have missing IDs.
- Distinct-conversation and distinct-session aggregation rule.
- Timestamp/timezone, business-unit, project, and channel attribution.
- Coverage threshold and no-data behavior.

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

**Waiting for approval / confirmation**

- Session-end or idle-gap rule, including cross-day handling.
- One-query-session and missing-timestamp treatment.
- Timestamp timezone and duration-band approval.
- Retry and duplicate-event behavior.
- Business-unit, project, and channel attribution, coverage, and no-data
  behavior.

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

**Waiting for approval / confirmation**

- Coverage threshold for each field and how partial coverage is reported.
- Completeness, freshness, and null/invalid-value rules.
- Session, conversation, timestamp, and channel relationship checks.
- Business-unit, project, and channel attribution for the selected scope.
- API states for complete, partial, unavailable, and no data.

## Excluded from this tracker

This drawer intentionally does not add the main Sessions/Queries trend,
headline totals, feature usage, workflow completion, satisfaction, raw user or
session data, technical diagnostics, or causal claims. Those are outside the
Engagement patterns drawer's purpose.

## Quick view — required confirmations

| Displayed element | Confirmation needed |
| --- | --- |
| Session Depth Distribution | Query identity; session population; deduplication; depth bands and selected-scope attribution. |
| Conversation Pattern | Session/conversation relationship; cross-session rule; aggregation and coverage. |
| Session-Duration Distribution | Session-end rule; timestamp coverage/timezone; duration bands and duplicate-event treatment. |
| Engagement Measurement Coverage | Coverage threshold; field completeness/freshness; selected-scope attribution and API state. |
