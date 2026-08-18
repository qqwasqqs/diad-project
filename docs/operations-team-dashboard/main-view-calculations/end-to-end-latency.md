# End-to-End Latency — Full Main-View Specification

## Element shown in the concept

| Property | Value |
| --- | --- |
| Section | Operational situation and Service-path stability |
| Card | End-to-End Latency |
| Statistic | P95 latency |
| Illustrative value | `P95 1.20 s` |
| Trend | 30-day `End-to-End P95` series, milliseconds |
| Visible scope | Last 30 days, business unit, project, channel |

The card and trend use one canonical calculation. `1.20 s` is illustrative; it
is not an approved SLA, target, or breach state.

## Persona and KPI support

| Item | Confirmed definition |
| --- | --- |
| Persona | Operations Team |
| Classification / category | Performance / Latency |
| Source | UI Layer |
| Fields | `timestamp_start`, `timestamp_end`, `response_latency_ms` |
| Mapped calculation | `AVG(response_latency_ms)` or `P95(response_latency_ms)` |

`timestamp_start` is the UI submit time and `timestamp_end` is final response
rendering time. `response_latency_ms` is the primary user-experience duration.

## Business meaning

P95 answers: **within the eligible request population, how long did 95% of
responses take to complete from user submission through final rendering?** It
shows slow-tail user impact, which an average can hide. It does not isolate model,
retrieval, pipeline, or tool latency.

## Per-request calculation and dashboard aggregation

```text
response_latency_ms = timestamp_end - timestamp_start

bucket_p95_ms = P95(eligible, deduplicated request-level response_latency_ms)
card_p95_ms   = P95(eligible, deduplicated request-level response_latency_ms
                    across the selected period)
display_card  = round(card_p95_ms / 1000, 2) + " s"
```

P95 must be calculated from individual request values, not daily averages.
Illustrative example: if the approved percentile convention returns 1,200 ms,
the card displays `P95 1.20 s` and means 95% of eligible requests completed in
1.20 seconds or less.

## Recommended eligible population

- One final UI response event per canonical request key.
- Valid nonnegative numeric latency with a usable terminal timestamp.
- Exclude duplicates, retransmissions, invalid duration, and incomplete terminal
  records; report them as telemetry-quality gaps.
- Classify timeout, cancelled, content-filtered, and failed outcomes explicitly;
  do not silently call them successful latency observations.

## Assumptions

An approved request key, timestamp/timezone, percentile convention, and selected
dimension attribution will be available. Splunk/an approved API filters,
deduplicates, and aggregates; React only formats returned results.

## Verification tests

1. A known request set produces the approved P95, not P95 of averages.
2. Duplicate events do not change the result.
3. A negative/missing duration is excluded and surfaced as a quality gap.
4. An unsupported selected dimension returns `FILTER BREAKDOWN UNAVAILABLE`.
5. Empty eligible population returns an approved no-data state, never `0 s`.

## Client questions

What is the canonical request key? Which outcomes are eligible? Which percentile
interpolation, timezone, bucket, rounding, sample-size, SLA, and threshold rules
are approved? Can UI outcomes be attributed to every global filter?
