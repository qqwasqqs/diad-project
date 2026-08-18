# Adoption and Engagement — Short Version

## Elements shown in the approved main view

| Placement | Statistic | Illustrative display |
| --- | --- | --- |
| Product experience pulse | total queries, sessions, queries/session | `316K queries`; `68K sessions · 4.6 queries/session` |
| Adoption and engagement | daily sessions and queries trend | 30-day `Sessions` and `Queries` lines |
| Adoption and engagement | average session duration | `8.2 min avg session` |

These are one Session & Query Volume calculation family, not independent business-value or completion metrics.

## Persona and KPI support

| Item | Confirmed definition |
| --- | --- |
| Persona | Product Owners |
| Classification / category | Adoption / User Engagement |
| Metric | Session & Query Volume (Session Length / Query per Session) |
| Source | UI Layer |
| Fields | `session_id`, `conversation_id`, `user_id`, `channel`, `timestamp_start` |
| Mapped calculation | average session length; total queries / total sessions |

`session_id` groups a session, `timestamp_start` can derive a min/max duration, and `channel` supports a channel breakdown. The mapping does not list `request_id`; use it only if an approved UI/API contract confirms it as the unique query key.

## Proposed calculation

```text
session_query_count(session) = COUNT(DISTINCT approved query_key)
session_start                = MIN(timestamp_start per session)
session_end                  = MAX(timestamp_start per session)
session_duration_minutes     = (session_end - session_start) / 60 seconds

total_queries                = COUNT(DISTINCT approved query_key)
total_sessions               = COUNT(DISTINCT session_id)
queries_per_session          = total_queries / total_sessions
avg_session_minutes          = AVG(session_duration_minutes)

daily_sessions(date)         = COUNT(DISTINCT session_id in date)
daily_queries(date)          = COUNT(DISTINCT approved query_key in date)
```

For the illustrative cards, `316,020 / 68,700 = 4.6` queries/session. Pictured daily lines are illustrative. A one-query session has zero timestamp-derived duration unless an approved session-end or inactivity rule exists.

## Meaning and eligible population

This answers: **Are people using the product, how often do they interact during a session, and how long do those observed sessions span?** It does not prove satisfaction, feature adoption, workflow completion, or business value.

Use one user-submitted UI query per approved key; exclude tool calls, model calls, agent steps, and automatic retries; deduplicate telemetry; and require valid session/timestamp values for the dependent measures. Missing session values must not become zero sessions or zero minutes.

## Assumptions and questions

Assume daily buckets for the 30-day lines, inclusion of submitted queries regardless of outcome, and API-side filtering/aggregation. Confirm the canonical query key; session start/end and idle-gap rules; cross-day/session handling; timestamp/timezone; retry and deduplication; whether failed/abandoned submissions belong; attribution to BU/project/channel; and no-data/coverage behavior.
