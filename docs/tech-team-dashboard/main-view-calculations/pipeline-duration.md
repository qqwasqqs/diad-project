# Pipeline Duration avg — Short Version

## Element shown in the approved main view

| Property | Value |
|---|---|
| Section | Request-path health |
| Statistic | Pipeline Duration avg |
| Illustrative value | `42 s` |
| Scope | Last 30 days, business unit, project, channel |

The value is illustrative and is an asynchronous-workload indicator, not a component to add to End-to-End Latency.

## Persona and KPI support

| Item | Confirmed definition |
|---|---|
| Persona | Technical Teams |
| Classification / category | Performance / Latency |
| Source | Azure Data Factory |
| Fields | `pipelineName`, `runId`, `run_start_timestamp`, `run_end_timestamp`, `duration` |
| Documented calculation | Pipeline duration per request = `duration`; then `AVG(Pipeline Duration per request)` |

`runId` is the pipeline-execution key and `duration` is the total runtime emitted by ADF.

## Business meaning and calculation

This statistic answers: **How long did eligible ADF pipeline executions take on average?**

```text
run_duration_ms = duration
average_ms      = AVG(valid run_duration_ms)
display_value   = round(average_ms / 1000, 0) + " s"
```

Example: runs of `40 s`, `42 s`, and `44 s` display `42 s`. If timestamps are used to calculate a missing duration, normalize units and require `run_end_timestamp >= run_start_timestamp`.

## Recommended eligible population

- Use one final record per `runId`, deduplicating retried/retransmitted log events.
- Decide whether failed, cancelled, or still-running pipeline executions belong in the average; do not map them to zero.
- Do not claim request-level attribution unless `runId` is reliably correlated to an originating request; the mapping names a per-request calculation but does not establish that link.

## Assumptions and client questions

Assumptions: the card averages completed pipeline runs, displays seconds, and filters only attributable run records.

Questions: Is `duration` milliseconds in the production contract? Which terminal statuses are eligible? Does a rerun replace, supplement, or remain distinct from the first run? Is the metric per pipeline run, per originating request, or both? How are global filters and bucket/timezone rules applied?
