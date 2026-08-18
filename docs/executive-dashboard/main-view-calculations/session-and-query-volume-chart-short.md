# Session and Query Volume Chart — Short Version

This document covers only the chart-specific calculation. Shared definitions, fields, eligible-event rules, session duration, queries per session, and client questions are documented in [Session and Query Volume Card — Short Version](session-and-query-volume-card-short.md).

## Chart shown in the concept

| Property | Concept value |
|---|---|
| Section | Adoption movement, below Executive pulse |
| Chart | Session & Query Volume (Session Length / Query per Session) |
| Visualization | Dual-line time series |
| Series | Sessions and Queries |
| Concept interval | Daily values over 30 days |
| Supporting values | `4.6 queries/session` and `8.2 min avg session` |
| Visible scope | Last 30 days, business unit, project, and channel |

All displayed values and dates are illustrative.

## Persona and KPI support

This chart visualizes the same Executive **Adoption / User Engagement** metric as the summary card. It does not introduce a new KPI.

For the chart calculation, the key fields inherited from the card specification are:

- `request_id` for distinct queries;
- `session_id` for distinct sessions;
- `timestamp_start` for time buckets.

The business-unit, project, channel, event-grain, deduplication, and session rules remain governed by the linked card documentation.

## Business meaning

The likely Executive interpretation is:

> How are user-query activity and active-session volume changing over the selected period?

The chart shows movement and relative direction. It does not prove satisfaction, successful task completion, or business value.

## Per-bucket calculation

For each time bucket after filters and deduplication:

```text
bucket_queries = COUNT(DISTINCT request_id)
bucket_sessions = COUNT(DISTINCT session_id)
```

Proposed 30-day implementation:

```text
bucket = calendar day derived from timestamp_start
```

Illustrative chart point:

```text
Date:                  Aug 1
Distinct request IDs:  12,400
Distinct session IDs:   2,700

Queries point:  12,400
Sessions point: 2,700
```

The same `session_id` may appear in more than one daily bucket when it has activity on multiple days.

## Chart aggregation and reconciliation

Apply the selected time, business-unit, project, and channel filters before creating the time buckets. Return one Queries value and one Sessions value for every expected bucket.

- The Queries line uses the query count for each bucket.
- The Sessions line uses the distinct sessions active within each bucket.
- The `4.6 queries/session` and `8.2 min avg session` values below the chart use the period-level calculations from the card documentation; they are not calculated from the plotted points.
- Daily query counts may be summed to reproduce the period query total when every request belongs to exactly one daily bucket.
- Daily active-session counts must not be summed to reproduce the period distinct-session total, because a session can be active on multiple days.

If a bucket has confirmed complete telemetry and no activity, it may display zero. If telemetry is missing or stale, the chart should show an approved gap or `Data Pending` state rather than a false zero. Missing points should not be interpolated as observed data.

## Recommended eligible population

Use the eligible query population defined in the [card specification](session-and-query-volume-card-short.md#recommended-eligible-population). Chart-specific recommendations are:

- Assign each eligible query to exactly one bucket using `timestamp_start`.
- Count each `request_id` once within its bucket.
- Count each `session_id` once per bucket, even when it contains several queries in that bucket.
- Produce a continuous sequence of expected time buckets so missing telemetry can be distinguished from absent activity.
- Apply the same filters and authorization scope to both series and the supporting values.

## Assumptions

- The 30-day view uses daily calendar buckets.
- The Sessions line represents sessions with activity in the bucket, not sessions that originally started in the bucket.
- `timestamp_start` is the approved bucketing timestamp.
- One UI `request_id` represents one query.
- The dual-axis presentation is illustrative and both axes are clearly labeled.
- The supporting queries-per-session and average-session values are calculated once over the complete selected period.
- Splunk or an approved API layer performs bucketing, deduplication, filtering, and aggregation.
- The chart is neutral engagement information and has no approved healthy or unhealthy direction.

## Potential questions for the client

1. Should the Sessions line show sessions active during each bucket or only sessions that started during each bucket?
2. Which timezone defines calendar-day boundaries?
3. How should sessions spanning multiple days be represented and explained?
4. Should the bucket interval remain daily for every period, or change for shorter and longer selections?
5. Should failed, timed-out, cancelled, or content-filtered queries follow exactly the same inclusion rule as the summary card?
6. Can business unit, project, channel, application, and environment filters be applied consistently to both series?
7. How should the chart distinguish true zero activity from missing, delayed, or incomplete telemetry?
8. Is the dual-axis presentation approved, and what scale and tooltip rules should prevent misleading visual comparisons?
9. Should the chart provide previous-period comparison, targets, or annotations, or remain a current-period trend only?
10. What are the approved loading, no-data, `Data Pending`, stale-data, and API-error states?
