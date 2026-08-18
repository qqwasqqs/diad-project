# Request-path Health Chart — Short Version

## Element shown in the approved main view

| Property | Value |
|---|---|
| Section | Request-path health |
| Element | 30-day four-series latency trend |
| Series | End-to-End P95; Model Response avg; Retrieval avg; Tool Call avg |
| Illustration | approximately 1,200 ms; 760 ms; 210 ms; 180 ms |
| Scope | Last 30 days, business unit, project, channel |

All trajectories and values are illustrative. The note **“Component times are not additive”** is required.

## Persona and KPI support

| Series | Source and fields | Documented calculation | Feasibility |
|---|---|---|---|
| End-to-End P95 | UI: `timestamp_start`, `timestamp_end`, `response_latency_ms` | `AVG` or `P95(response_latency_ms)` | Supported; view selects P95 |
| Model Response avg | Azure OpenAI / backend: `model_latency_ms`, AOAI timestamps, `completion_status` | `AVG(model_latency_ms)` | Supported |
| Retrieval avg | AI Search / backend: `query_latency_ms`, `DurationMs`, retrieval timestamps | `AVG(query_latency_ms)` | Supported |
| Tool Call avg | Orchestration/agent: `tool_call_latency`, `tool_name` | `AVG(tool_call_latency)` | Supported |

## Semantics and business meaning

The chart lets Technical Teams compare user-visible request latency with component timings to identify where investigation may start. End-to-end time includes orchestration, network, rendering, and other work; component values can overlap, be absent, or be asynchronous. It is therefore invalid to sum the three component series and compare the result as a decomposition of end-to-end latency.

## Per-record calculation and aggregation

```text
end_to_end_ms = timestamp_end - timestamp_start
end_to_end_point = P95(eligible response_latency_ms in bucket)
model_point      = AVG(eligible model_latency_ms in bucket)
retrieval_point  = AVG(eligible query_latency_ms in bucket)
tool_point       = AVG(eligible tool_call_latency in bucket)
```

Apply time and attributable global filters first. Use one approved, timezone-defined bucket boundary for all series. P95 must be calculated from request-level values, not averages. A request with multiple tool calls needs an approved request-level roll-up (for example, sum, max, or mean) before it can be directly compared with request-level series.

Illustrative example: a bucket with request latencies `800, 900, 1,200, 1,600, 1,900 ms` has P95 determined from the individual values under the selected percentile convention; it is not `P95` of pre-aggregated daily averages.

## Recommended eligible population

- Keep one terminal UI response event per request for End-to-End P95; exclude missing, negative, or non-numeric durations as telemetry-quality gaps.
- For component series, use valid terminal/instrumented operations and deduplicate producer retransmissions with an approved operation or span key.
- Do not silently treat failed, timed-out, cancelled, content-filtered, or incomplete operations as successful latency observations; confirm the population for each series.
- Do not display a series where filter attribution or timestamp alignment is unavailable.

## Assumptions and client questions

Assumptions: 30-day period, one shared millisecond axis, P95 only for End-to-End Latency, averages for the three mapped components, and aggregation in Splunk/an approved API.

Questions: What timestamp and timezone define each bucket? What is the canonical request/span key and retry rule? How are multiple model/retrieval/tool calls rolled up? Which terminal outcomes are eligible? Can all four sources be correlated and attributed to each global filter? Which percentile interpolation and display precision are approved?
