# Pipeline Duration — Short Version

## Element shown

`Pipeline Duration avg 42 s` appears as illustrative diagnostic context in the
Service-path Stability panel.

## Confirmed facts

- Source: ADF.
- Fields: `pipelineName`, `runId`, `run_start_timestamp`, `run_end_timestamp`,
  and `duration`.
- Documented calculation: pipeline duration per request equals `duration`, then
  average pipeline duration per request.

## Per-record calculation and dashboard aggregation

```text
pipeline_duration_ms = duration
  or approved(run_end_timestamp - run_start_timestamp)
display_seconds      = AVG(eligible final pipeline duration) / 1000
```

Example only: final pipeline durations `36`, `42`, and `48` seconds have an
average of `42 s`. `runId` should be one final pipeline execution, not a retry
attempt or duplicate diagnostic event.

## Business meaning

This is a workload-runtime context signal. It does not prove a pipeline-specific
SLA breach because no SLA target or per-pipeline applicability is documented.

## Assumptions

The image's `42 s` is illustrative, `duration` is normalized to milliseconds or
seconds before display, and a global selection applies only where reliable
attribution exists.

## Missing evidence and client questions

Which field wins if supplied `duration` conflicts with timestamps? Which final
states are eligible? How are cancellation, retries, overlapping runs, pipeline
names, timezone, precision, per-pipeline SLAs, and selected dimensions handled?
