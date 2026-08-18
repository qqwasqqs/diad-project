# API Error Rate Card — Short Version

This is the compact implementation reference for the Executive Dashboard card. See [Executive Dashboard API Error and User Feedback Details](../executive-dashboard-api-error-and-feedback-details.md) for the related detail-view design.

## Card shown in the concept

| Property | Concept value |
|---|---|
| Section | Executive pulse |
| Card | API Error Rate (Inference Errors) |
| Statistic | Error rate |
| Illustrative value | `1.14%` |
| Visible scope | Last 30 days, business unit, project, and channel |

The value is illustrative. Targets and thresholds have not been validated, so the amber styling does not represent an approved attention state.

## Persona and KPI support

| Item | Confirmed definition |
|---|---|
| Persona | Business Executives |
| Classification | Reliability |
| KPI category | Error Rate |
| Metric | API Error Rate (Inference Errors) |
| Source | UI Layer and Azure OpenAI as client |
| Fields | `status_code`, `error_code (API)`, `response_status`, `error_message (API)` |
| Supported calculation | `Error count / Total requests` |

The broader design describes API errors as failed API calls such as HTTP `4xx`, `5xx`, and `429`. The Executive mapping does not confirm exactly how that rule should be combined with `response_status`.

## Event and error semantics

- `status_code`: described as an HTTP response status in the Executive mapping and Azure OpenAI response event.
- `error_code (API)`: structured error code used to identify recurring failure types.
- `response_status`: documented values are `success`, `error`, `timeout`, and `content_filtered`.
- `error_message (API)`: human-readable detail intended for root-cause analysis, not for display on the Executive card.

The detailed UI event schema describes its `status_code` differently—as a structured error code. The production implementation therefore needs a normalized distinction between HTTP status and application error code.

## Business meaning

API Error Rate answers:

> What percentage of eligible requests in the selected scope resulted in an approved inference/API error?

`1.14%` means that 1.14 of every 100 eligible requests were classified as errors under the approved rule. It does not identify the error type or root cause.

## Per-request classification

The error rule is not fully confirmed. A simple proposed classification is:

```text
error_flag = 1 when response_status = "error"
error_flag = 0 otherwise
```

Each request must have one canonical terminal outcome before aggregation. `status_code` and `error_code (API)` can support validation and breakdowns, but the same failed request must not be counted more than once.

## Card aggregation

Apply the selected time, business-unit, project, and channel filters first. Then calculate:

```text
error_requests = COUNT(DISTINCT request_key WHERE error_flag = 1)
total_requests = COUNT(DISTINCT request_key)

api_error_rate_percent = (error_requests / total_requests) * 100
display_value          = round(api_error_rate_percent, 2) + "%"
```

Example:

```text
Error requests: 114
Total requests: 10,000

API Error Rate = (114 / 10,000) * 100
               = 1.14%
```

If `total_requests` is zero, the card should show an approved no-data state rather than `0%`.

## Recommended eligible population

This behavior still requires client confirmation:

- Use one approved request key and one terminal outcome per request.
- Count all eligible requests in the denominator, including successful and failed outcomes.
- Count `response_status = error` in the numerator.
- Do not silently classify `timeout`, `content_filtered`, cancelled, or abandoned requests as errors.
- Remove duplicate events before aggregation.
- Decide how retries are represented before counting them.
- Exclude records without the minimum fields needed to establish request identity and terminal outcome, and report them as telemetry-quality issues.

## Assumptions

The formula is confirmed, but these implementation rules are assumptions:

- The Executive card measures final request outcomes, not every internal model-call attempt.
- A distinct request identifier will be available or derived through an approved correlation rule.
- `response_status = error` is the initial numerator rule.
- `timeout` and `content_filtered` remain outside the numerator until the client approves their treatment.
- HTTP `4xx` and `5xx`, including `429`, support error classification when normalized to the same request outcome, without double-counting an error already identified through `response_status`.
- The denominator contains all eligible requests with a usable terminal outcome.
- Business-unit, project, and channel fields will be present on the outcome event or reliably added through Splunk correlation/enrichment.
- Splunk or an approved API layer performs filtering, deduplication, and aggregation; the dashboard only formats the returned percentage.
- The displayed `1.14%` is illustrative and is not production data.

## Potential questions for the client

1. What is the denominator grain: user request, inference request, API call, or individual retry attempt?
2. What exactly enters the numerator: `response_status = error`, HTTP `4xx`, HTTP `5xx`, `429`, timeouts, content-filtered responses, or another approved combination?
3. If an initial API attempt fails but a retry succeeds, should the Executive card show a successful final request or a failed API attempt?
4. What is the canonical request identifier and deduplication rule?
5. Are `status_code` and `error_code (API)` separate normalized fields, and what approved taxonomy applies to each?
6. Which event timestamp determines whether a request belongs to the selected period?
7. Can each outcome be reliably attributed to business unit, project, channel, application, and environment?
8. What should happen when only part of the selected scope has usable error telemetry?
9. What minimum sample size is required before displaying an error rate?
10. What target and thresholds determine neutral, attention, and critical states?
11. Should the card expose the error-request count and total-request count in a tooltip or detail view?
12. What are the required no-data, `Data Pending`, stale-data, and API-error states?
