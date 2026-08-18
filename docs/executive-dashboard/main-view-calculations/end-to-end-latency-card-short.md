# End-to-End Latency Card — Short Version

This is the compact implementation reference for the Executive Dashboard card. See [End-to-End Latency Card Calculation](end-to-end-latency-card.md) for the full data contract, risks, client questions, and verification guidance.

## Card shown in the concept

| Property | Concept value |
|---|---|
| Section | Executive pulse |
| Card | End-to-End Latency |
| Statistic | P95 |
| Illustrative value | `1.20 s` |
| Visible scope | Last 30 days, business unit, project, and channel |

The value is illustrative. Targets and thresholds have not been validated, so the green styling does not yet mean that latency is healthy.

## Persona and KPI support

| Item | Confirmed definition |
|---|---|
| Persona | Business Executives |
| Classification | Performance |
| KPI category | Latency |
| Metric | End-to-End Latency |
| Source | UI Layer |
| Fields | `timestamp_start`, `timestamp_end`, `response_latency_ms` |
| Supported calculation | `AVG(response_latency_ms)` or `P95(response_latency_ms)` |

The dashboard concept selects **P95**.

## Timing semantics

- `timestamp_start`: when the user submits the request in the UI.
- `timestamp_end`: when the final response is received and rendered in the UI.
- `response_latency_ms`: the elapsed time between those two events, in milliseconds.

The detailed design expects the UI to emit a terminal `response_returned` event containing `correlation_id`, `response_latency_ms`, and `response_status`.

## Business meaning

P95 End-to-End Latency answers:

> How long did 95% of eligible user requests take from UI submission until the final response was rendered?

`P95 1.20 s` means that 95% of eligible requests completed in **1.20 seconds or less**. The slowest 5% took longer. It is not the average latency.

## Per-request calculation

```text
response_latency_ms = timestamp_end - timestamp_start
```

Example:

```text
Request submitted:       10:00:00.000
Final response rendered: 10:00:01.200
response_latency_ms:     1,200 ms
```

Recommended UI behavior:

1. Start timing when the request is submitted.
2. Stop timing after the final response is rendered.
3. Emit `response_latency_ms` on one terminal `response_returned` event.

## Card aggregation

Apply the selected time, business-unit, project, and channel filters first. Then calculate P95 from the remaining request-level values:

```text
card_value_ms = P95(response_latency_ms)
card_value_s  = card_value_ms / 1000
display_value = round(card_value_s, 2) + " s"
```

The P95 must be calculated from individual requests, not from daily or project-level averages.

## Recommended eligible population

This behavior still requires client confirmation:

- Keep one terminal event per request and remove duplicates.
- Use successful requests for the main latency value.
- Show errors and timeouts in the adjacent API Error Rate card.
- Obtain a client decision for `content_filtered`, cancelled, abandoned, and timed-out requests.
- Exclude missing, non-numeric, or negative latency values and record them as telemetry-quality issues.

Excluding failures can make latency appear better, so the error-rate card should remain visible and the data response should include the latency sample count.
