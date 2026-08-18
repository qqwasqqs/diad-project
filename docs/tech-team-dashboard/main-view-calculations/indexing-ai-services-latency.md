# Indexing / AI Services avg — Short Version

## Element shown in the approved main view

| Property | Value |
|---|---|
| Section | Request-path health |
| Statistic | Indexing / AI Services avg |
| Illustrative value | `620 ms` |
| Scope | Last 30 days, business unit, project, channel |

The label groups several heterogeneous services. Its single average is therefore only **partially supported** and must not be read as an end-to-end component or a service SLA.

## Persona and KPI support

| Item | Confirmed definition |
|---|---|
| Persona | Technical Teams |
| Classification / category | Performance / Latency |
| Sources | Azure AI Search, AI Speech, AI Translation, ADF/Databricks indexing |
| Fields | `indexer_execution_time_ms`, processing timestamps, `processing_duration_ms`, `transcription_latency_ms`, `translation_latency_ms`, `audio_duration_ms` |
| Documented calculation | `service_execution_time_ms` or `service_duration_ms` |

The mapping supplies no approved composite numerator, weighting method, operation grain, or service eligibility rule.

## Business meaning and calculation

The likely technical reading is: **What is the average latency of the approved indexing/AI-service operation population?** This is not confirmed for a cross-service blend.

Proposed only after a client decision:

```text
normalized_duration_ms = approved service-specific duration
service_average_ms     = AVG(normalized_duration_ms by service)
combined_average_ms    = approved weighted aggregation of service averages
```

Do not calculate `AVG` across raw indexer runs, transcription jobs, and translations without defining the mix: a high-volume service would dominate a raw record-weighted average, while an equal-service average would give each service equal weight.

## Recommended eligible population

- Keep each service operation type separately identifiable and use its native final-operation identifier.
- Exclude incomplete/malformed values; do not interpret unavailable service telemetry as zero.
- Present `DATA PENDING` or service-specific values if a selected global filter cannot be correlated to all services.

## Assumptions and client questions

Assumptions: `620 ms` is illustrative; only normalized millisecond durations are eligible; aggregation happens outside React.

Questions: Which service operations belong in this indicator? Is it a weighted cross-service measure, a selected service, or a worst service? What IDs and terminal statuses define one operation? Are durations comparable across audio/document workloads? Can filters and timestamps be normalized across all sources?
