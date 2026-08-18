# Failure Localization — Short Version

## Element shown in the approved main view

| Property | Value |
|---|---|
| Section | Failure localization |
| Element | Eight horizontal failure-rate comparisons |
| Illustrations | Pipeline `0.7%`; Job `0.9%`; Inference `1.14%`; API Service `0.8%`; Training `0.5%`; Indexing `0.6%`; Transcription `0.4%`; Translation `0.3%` |
| Scope | Last 30 days, business unit, project, channel |

No target line is shown. Bar length compares illustrative rates only; it does not establish severity thresholds.

## Persona and KPI support

| Rate | Fields | Source formula | Feasibility |
|---|---|---|---|
| Pipeline | `status`, `failureType`, `triggered_by`, `errorCode` | `Total(error_code) / Total Request` | Derivable; failure-state rule needed |
| Job | `jobTerminalState`, `response.statusCode`, `job_id` | `Total(failed response.statusCode) / Total Request` | Derivable; denominator/grain needed |
| Inference | model-call status/error fields | `Total(error_code) / Total Request` | Derivable |
| API Service | API status/error fields | `Total(AI related Error_Code) / Total Request` | Derivable |
| Training | `training_status` | `Count(Failure) / Count(All Training Runs) * 100` | Supported |
| Indexing | `indexing_status`, `failed_document_count` | `Count(Failure) / Count(All Indexing requests) * 100` | Partially supported; partial failures unresolved |
| Transcription | `transcription_status`, `confidence_score`, `word_error_rate` | `Count(Failure) / Count(All Transcription requests) * 100` | Supported |
| Translation | `translation_status` | `Count(Failure) / Count(All Translation requests) * 100` | Supported |

## Semantics, calculation, and example

Each bar answers: **What percentage of eligible terminal records for this workload were classified as failures?** It is a separate rate with its own grain, not one shared denominator across services.

```text
failure_rate_pct(metric) =
  COUNT(DISTINCT approved_unit WHERE approved_failure_rule) /
  COUNT(DISTINCT eligible approved_unit) * 100
```

Example: `7` failed pipeline runs out of `1,000` eligible pipeline runs display `0.7%`. The chart must not sum the eight rates or compare their raw failure counts by bar length.

## Recommended eligible population

- Use one final execution/call per metric-specific key (`runId`, `job_id`, request/call key, training run, indexing operation, transcription/translation operation).
- Define the failure rule per source status taxonomy; do not equate non-success, timeout, cancellation, partial completion, or a non-empty error field without approval.
- For indexing, decide whether `failed_document_count > 0` makes an otherwise successful run a failure, a separate partial-failure signal, or both.
- Deduplicate retries/retransmission and apply global filters only with attributable source records.

## Assumptions and client questions

Assumptions: all values are illustrative, calculations occur per metric before display, and rates share a percent format but not an event grain.

Questions: What terminal outcome/denominator applies to each rate? How are retries, partial failures, cancellation, and timeouts classified? What exact field normalizations are required? Can each source honor every global filter? What sample-size, precision, threshold, and no-data rules apply?
