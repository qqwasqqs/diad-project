# Failure Surface — Short Version

## Element shown

Nine illustrative percentage comparisons: Pipeline `0.7%`, Activity `0.6%`, Job
`0.9%`, API `1.14%`, Training `0.5%`, MLflow Span `0.8%`, Indexing `0.6%`,
Transcription `0.4%`, and Translation `0.3%`. No target line is shown.

## Persona and KPI support

| Rate | Source fields | Documented formula / status |
| --- | --- | --- |
| Pipeline | `status`, `failureType`, `triggered_by`, `errorCode` | Error code / total request |
| Activity | `status`, activity name/code/message, `retry_count` | Error code / total request |
| Job | terminal state, response status/error, `job_id` | Failed response status / total request |
| API | HTTP/API status and error fields | AI-related error code / total request |
| Training | `training_status` | failed runs / all training runs * 100 |
| MLflow Span | `span_status`, error message | failed spans / all training runs * 100; grain conflict |
| Indexing | `indexing_status`, failed-document count | failures / all indexing requests * 100 |
| Transcription | status, confidence, WER | failures / all transcription requests * 100 |
| Translation | `translation_status` | failures / all translation requests * 100 |

## Calculation and business meaning

Each bar answers: what proportion of its own eligible terminal workload is
classified as failed? It is not one common denominator and bars must not be
summed.

```text
failure_rate(metric) =
  COUNT(DISTINCT approved metric-specific unit where failure rule is true) /
  COUNT(DISTINCT eligible metric-specific unit) * 100
```

Example only: 7 failed pipeline runs among 1,000 eligible pipeline runs display
`0.7%`. Bar length compares illustrative percentages, not approved severity.

## Recommended eligible population

Use one final metric-specific unit: pipeline/activity run, job run, API request,
training run, MLflow span (once resolved), indexing operation, transcription
operation, or translation operation. Define final-status taxonomies; deduplicate
retries/retransmissions; and apply global dimensions only when attributable.

## Assumptions

All values are illustrative. Percent format does not establish identical event
grain, sample size, precision, or threshold. A non-empty error message alone is
not a failure rule.

## Missing evidence and client questions

What terminal outcome and denominator apply to each rate? How do retries,
cancellation, timeout, partial result, `failed_document_count`, and content
filtering behave? Is MLflow Span Error Rate span-based or training-run-based?
What normalizations, filter attribution, minimum sample, rounding, and attention
thresholds are approved?
