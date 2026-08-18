# Inference Error Rate — Short Version

## Element shown in the approved main view

| Property | Value |
|---|---|
| Section | Request-path health |
| Statistic | Inference Error Rate |
| Illustrative value | `1.14%` |
| Scope | Last 30 days, business unit, project, channel |

The amber styling is illustrative; no threshold is approved.

## Persona and KPI support

| Item | Confirmed definition |
|---|---|
| Persona | Technical Teams |
| Classification / category | Reliability / Error Rate |
| Source | Azure OpenAI as client |
| Fields | `status_code`, `error_code (Model call)`, `response_status (Model call)`, `error_message (Model call)` |
| Documented calculation | `Total(error_code) / Total Request` |

Only `status_code` has a documented field meaning (HTTP response status); the other listed model-call fields lack an exact registry definition.

## Business meaning and calculation

Inference Error Rate answers: **What percentage of eligible model-call attempts or final model-call outcomes were classified as errors?** The denominator grain is not confirmed.

```text
error_flag = approved normalized model-call error rule
rate_pct   = COUNT(DISTINCT eligible_key WHERE error_flag) /
             COUNT(DISTINCT eligible_key) * 100
display    = round(rate_pct, 2) + "%"
```

Illustrative example: `114` approved error outcomes out of `10,000` eligible outcomes yields `1.14%`. Do not combine `status_code`, error code, and response status by simple addition: one failed call could then be counted several times.

## Recommended eligible population

- Normalize one terminal outcome per chosen grain: model-call attempt or user request after retries.
- Derive a single `error_flag` from an approved priority rule; retain HTTP code/error code for breakdown only.
- Do not silently include timeouts, content-filtered outcomes, or cancellations in the numerator until approved.
- Never expose `error_message` on the card; it is root-cause detail and may contain sensitive information.

## Assumptions and client questions

Assumptions: an approved call/request key will be correlated, `response_status = error` is a plausible initial rule only, and the dashboard receives an already aggregated percentage.

Questions: Is the rate per model-call attempt or final user request? Which field/value is authoritative? Are `4xx`, `5xx`, `429`, timeout, and content filtering errors? How are retries and duplicate logs treated? What timestamp, filter-attribution, minimum sample, and no-data rules apply?
