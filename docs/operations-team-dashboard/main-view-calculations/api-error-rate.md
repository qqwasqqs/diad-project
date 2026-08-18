# API Error Rate — Full Main-View Specification

## Element shown in the concept

| Property | Value |
| --- | --- |
| Section | Operational situation and Failure surface |
| Card / bar | API Error Rate / API |
| Statistic | Error rate |
| Illustrative value | `1.14%` |
| Scope | Last 30 days, business unit, project, channel |

Amber/red visual cues are illustrative. They do not establish an approved
attention threshold or confirmed incident.

## Persona and KPI support

| Item | Confirmed definition |
| --- | --- |
| Persona | Operations Team |
| Classification / category | Reliability / Error Rate |
| Source | UI Layer; Azure OpenAI as client |
| Fields | `status_code`, `error_code (API)`, `response_status`, `error_message (API)` |
| Mapped calculation | AI-related error code / total request |

`response_status` has documented values `success`, `error`, `timeout`, and
`content_filtered`. `error_message (API)` is root-cause evidence and is not a
main-view display field.

## Business meaning

The rate answers: **what percentage of eligible final API/request outcomes in
scope meet the approved error rule?** It is not a raw error count and does not
prove a root cause.

## Per-request classification and aggregation

Pending client confirmation, a conservative proposed starting rule is:

```text
error_flag = 1 when canonical_terminal_response_status = "error"
error_flag = 0 when canonical_terminal_response_status = "success"

api_error_rate_pct =
  COUNT(DISTINCT request_key where error_flag = 1) /
  COUNT(DISTINCT request_key with approved terminal outcome) * 100
```

Example: 114 distinct approved error requests out of 10,000 eligible terminal
requests displays `1.14%`. Do not count a request twice through both an error
code and `response_status`.

## Recommended eligible population

Use one canonical request key and final outcome. Keep `timeout`,
`content_filtered`, cancellation, partial completion, HTTP status taxonomy, and
retry-success behavior outside the numerator until approved. Deduplicate producer
events; exclude records without usable identity/outcome and report coverage.

## Assumptions

The proposed numerator is terminal `response_status = error`. Splunk/an approved
API normalizes HTTP and application error fields, applies scope, and aggregates.
The value is illustrative, not a live reliability result.

## Verification tests

1. One failed request with multiple error records counts once.
2. An error then successful retry follows the approved final-outcome rule.
3. Timeout/content-filter handling is explicit rather than implicit.
4. Zero eligible requests yields no-data, never `0%`.
5. Unsupported filter attribution yields the explicit unavailable state.

## Client questions

What is the numerator and denominator grain—user request, API call, inference
attempt, or retry? Which status codes/error codes qualify? How are 429, 4xx,
5xx, timeouts, content filtering, cancellation, duplicates, timezone, minimum
sample, rounding, thresholds, and filter coverage handled?
