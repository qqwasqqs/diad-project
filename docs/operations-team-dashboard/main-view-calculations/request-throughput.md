# Request Throughput — Short Version

## Element shown

`Request Throughput 42.8 req/s` appears as illustrative diagnostic context in
the Service-path Stability panel.

## Confirmed facts

- Source: UI Layer / Backend API.
- Fields: `request_id`, `timestamp`, `session_id`.
- Documented formula: distinct `request_id` in the time window divided by time
  window in seconds.

## Per-record calculation and dashboard aggregation

```text
eligible_requests = DISTINCT approved request_id in an approved time bucket
throughput_req_s  = COUNT(eligible_requests) / bucket_duration_seconds
```

Example only: 2,568 eligible distinct requests in a 60-second bucket display
`42.8 req/s`. A 30-day headline must specify whether it is a selected bucket,
average bucket rate, peak bucket rate, or another approved aggregation; the
image does not establish that choice.

## Business meaning

Throughput gives Operations context for latency and failure changes. It does not
measure sessions, token capacity, active tokens, or completed end-to-end flows
unless those populations are approved as equivalent.

## Recommended eligible population

Use one canonical request key and timestamp per request, remove duplicate
producer/retry events according to an approved rule, and report records missing
either field as telemetry-quality gaps. Do not sum pre-aggregated rates across
unequal bucket durations.

## Likely interpretation

The right-side value is a compact traffic-context indicator, not an alert or an
SLA target.

## Assumptions

The displayed value is an illustrative rate in requests per second. Splunk/an
approved API filters and aggregates only attributable selected dimensions.

## Missing evidence and client questions

What event timestamp, bucket duration, roll-up (average/peak/latest), timezone,
request identity, retry behavior, and filter attribution apply? Do cancelled,
timed-out, or content-filtered requests belong in the population?
