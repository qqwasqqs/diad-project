# Indexing / AI Services Latency — Short Version

## Element shown

`Indexing / AI Services avg 620 ms` appears as illustrative diagnostic context
in the Service-path Stability panel.

## Confirmed facts

The mapping groups Azure AI Search, Azure AI Speech, Azure AI Translation, and
ADF/Databricks indexing. Available fields include `indexer_execution_time_ms`,
processing timestamps/duration, `transcription_latency_ms`,
`translation_latency_ms`, and `audio_duration_ms`. The documented meaning is a
service execution time or service duration.

## Calculation status

No one aggregate is confirmed across these unlike operations. A safe future
calculation must select one service type or return a labeled multi-series/grouped
result:

```text
service_latency_ms(service_type) =
  AVG(eligible normalized service latency for that service_type)
```

`620 ms` is an illustrative design value only; it is not an all-service average
authorized by the mapping.

## Business meaning

The row indicates that service-side latency needs operational attention. It must
not combine indexing runs, document transcription, translation, and audio
duration as though they share a workload, unit, or SLO.

## Likely interpretation

The compact row is useful only if a future implementation labels the included
service population or defaults to `DATA PENDING` when it cannot do so.

## Assumptions

All source durations can be normalized to milliseconds before any comparable
display. Splunk/an approved API performs source-specific deduplication and only
applies selected dimensions with proven attribution.

## Missing evidence and client questions

Which service(s) should the row represent? Are all field units confirmed? What
operation key, timestamp, eligible outcome, retry rule, filter attribution, SLO,
sample size, and partial-failure treatment apply? Should audio's latency-to-audio
duration ratio be displayed separately rather than mixed with latency?
