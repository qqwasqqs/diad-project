# Session and Query Volume Card — Short Version

This is the compact implementation reference for the Session & Query Volume card in the Executive Dashboard.

## Card shown in the concept

| Property | Concept value |
|---|---|
| Section | Executive pulse |
| Card | Session & Query Volume |
| Primary value | `316K queries` |
| Supporting values | `4.6 queries/session` and `8.2 min avg session` |
| Visible scope | Last 30 days, business unit, project, and channel |

All values are illustrative. The current documentation does not define targets or attention thresholds for these adoption metrics.

## Persona and KPI support

| Item | Confirmed definition |
|---|---|
| Persona | Business Executives |
| Classification | Adoption |
| KPI category | User Engagement |
| Metric | Session & Query Volume (Session Length / Query per Session) |
| Source | UI Layer |
| Fields | `session_id`, `conversation_id`, `user_id`, `channel`, `timestamp_start` |
| Source calculation | Distinct User ID, average queries per user |

The field descriptions support session-level analysis and state that session duration can be derived from minimum and maximum timestamps per session. However, the source calculation does not explicitly define the three values shown in the concept: total queries, queries per session, and average session duration.

The detailed UI request schema also provides `request_id`, `session_id`, request timestamp, project, environment, and business-unit fields. It does not confirm `conversation_id` or `channel` on that same event.

## Session and query semantics

- `session_id`: groups multiple related user requests into one session.
- `conversation_id`: identifies a multi-turn conversation within a session.
- `user_id`: pseudonymized user identifier used for distinct-user analysis.
- `channel`: request-entry channel, with documented examples such as `web`, `teams`, `mobile`, and `api`.
- `timestamp_start`: timestamp when an individual request begins; minimum and maximum values can be used to estimate session duration.
- `request_id`: unique request or interaction identifier available in the detailed UI request schema, but not listed in the Executive mapping row.

The documentation does not define what ends a session, how long an idle gap may be, or whether one `session_id` can span multiple days.

## Business meaning

The likely Executive interpretation is:

> How much is the AI platform being used, how many user requests occur in a typical session, and how long do sessions remain active?

The three displayed values mean:

- `316K queries`: total eligible user queries in the selected scope.
- `4.6 queries/session`: average number of eligible queries in each session.
- `8.2 min avg session`: average elapsed time between the first and last eligible request in each session.

These metrics show activity and engagement. They do not, by themselves, prove user satisfaction, successful task completion, or business value.

## Per-session calculation

For each `session_id`:

```text
session_query_count = COUNT(DISTINCT request_id)

session_start = MIN(timestamp_start)
session_end   = MAX(timestamp_start)

session_duration_minutes =
  (session_end - session_start) / 60 seconds
```

A session containing only one recorded query produces a timestamp-based duration of zero unless the client provides a separate session-end event or inactivity rule.

## Card aggregation

Apply the selected time, business-unit, project, and channel filters before aggregation. Then calculate:

```text
total_queries  = COUNT(DISTINCT request_id)
total_sessions = COUNT(DISTINCT session_id)

average_queries_per_session = total_queries / total_sessions
average_session_minutes     = AVG(session_duration_minutes)
```

Illustrative example matching the rounded concept values:

```text
Total distinct queries: 316,020
Total distinct sessions: 68,700
Total session minutes:   563,340

Queries per session = 316,020 / 68,700
                    = 4.6

Average session duration = 563,340 / 68,700
                         = 8.2 minutes

Compact query display = 316K queries
```

If `total_sessions` is zero, the supporting values should show an approved no-data state rather than zero.

## Recommended eligible population

This behavior still requires client confirmation:

- Count user-submitted UI requests, not internal model calls, tool calls, agent steps, or automatic retries.
- Use one unique `request_id` per user query and remove duplicate telemetry events.
- Include all submitted user queries in adoption volume, regardless of final success, unless the client defines a different rule.
- Require a valid `session_id` for queries-per-session and session-duration calculations.
- Exclude missing or invalid timestamps from duration calculations and report them as telemetry-quality issues.
- Calculate session duration per session before averaging across sessions.
- Do not calculate duration by subtracting the earliest portfolio timestamp from the latest portfolio timestamp.

## Assumptions

The displayed calculations are not fully specified by the source. They use these assumptions:

- One UI `request_id` represents one user query.
- `COUNT(DISTINCT request_id)` is the total query volume.
- `session_id` is the approved engagement-session identifier.
- Average queries per session means total distinct queries divided by total distinct sessions.
- Session duration is estimated as the difference between the last and first `timestamp_start` in each session.
- Single-query sessions have a zero-minute duration until a better end-of-session signal is approved.
- Queries are assigned to the selected period using their request start timestamp.
- A session is included when it has eligible activity in the selected period; how to handle sessions crossing the period boundary remains unconfirmed.
- Business-unit, project, and channel dimensions will be present or reliably added through Splunk correlation/enrichment.
- Splunk or an approved API layer performs filtering, deduplication, grouping, and aggregation.
- `316K`, `4.6`, and `8.2 min` are illustrative rather than production values.

## Potential questions for the client

1. What exactly counts as a query: a user message, UI request, inference request, API call, or another event?
2. Is `request_id` the canonical unique query identifier across all applications and channels?
3. What officially defines a session, and when does a session expire after inactivity?
4. Can one `session_id` span multiple conversations, days, devices, or channels?
5. Should queries per session use `session_id` or `conversation_id` as the grouping key?
6. Should failed, timed-out, cancelled, content-filtered, or abandoned queries count toward adoption volume?
7. Should session duration use first-to-last request start, first request to final response, a session-end event, or an inactivity timeout?
8. How should single-query sessions be measured?
9. How should sessions that begin before or end after the selected reporting period be handled?
10. The source calculation mentions distinct users and average queries per user, while the concept shows queries per session. Which measures should the Executive card display?
11. Are business unit, project, application, channel, and environment reliably available for every eligible request?
12. What timezone, rounding, and compact-number rules should be used?
13. What should the card show when some queries have no `session_id` or usable timestamp?
14. What are the required no-data, `Data Pending`, stale-data, and API-error states?
