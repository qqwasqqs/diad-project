# Service-path Stability — Short Version

## Element shown

30-day four-series latency trend: `End-to-End P95`, `Model Response avg`,
`Retrieval avg`, and `Tool Call avg`, with the required note `Component times
are not additive`. The same panel contains four runtime-context rows: Request
Throughput, Pipeline Duration, Indexing / AI Services, and Token Throughput
pending.

## Persona and KPI support

| Series | Source fields | Documented calculation | Feasibility |
| --- | --- | --- | --- |
| End-to-End P95 | UI timestamps, `response_latency_ms` | AVG or P95 | Supported; this view selects P95 |
| Model Response avg | `model_latency_ms`, AOAI timestamps, `completion_status` | AVG(model latency) | Derivable |
| Retrieval avg | `DurationMs`, `query_latency_ms`, retrieval timestamps | AVG(query latency) | Derivable |
| Tool Call avg | `tool_call_latency`, `tool_name` | AVG(tool-call latency) | Derivable |

## Per-record calculation and dashboard aggregation

```text
end_to_end_ms = timestamp_end - timestamp_start
end_to_end_point = P95(eligible response_latency_ms in bucket)
model_point      = AVG(eligible model_latency_ms in bucket)
retrieval_point  = AVG(eligible query_latency_ms in bucket)
tool_point       = AVG(eligible tool_call_latency in bucket)
```

Filter by time and attributable global dimensions before aggregation. Use one
approved timezone-defined bucket boundary and milliseconds for all series. P95
must be calculated from request-level values, not from averages.

## Business meaning

The panel shows whether user-visible request time and mapped component timings
are moving together. It is not a time decomposition: calls can overlap, repeat,
be asynchronous, or be absent, so summing the components is invalid.

## Recommended eligible population

- One terminal UI response per request for End-to-End P95.
- Valid terminal/instrumented operation or span events for the component series,
  deduplicated using an approved operation/span key.
- Do not silently classify failed, timed-out, cancelled, content-filtered, or
  incomplete operations as successful latency observations.

## Assumptions

The 1,200/760/210/180 ms trajectories are illustrative. The initial series uses
P95 only for end-to-end latency and averages for components. Splunk/an approved
API performs aggregation.

## Missing evidence and client questions

What timestamp/timezone and percentile interpolation apply? How are multiple
model, retrieval, or tool calls rolled up per request? Which final outcomes are
eligible? What retry/deduplication rule and filter attribution contract apply?
