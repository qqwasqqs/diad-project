# Product Owner Dashboard Endpoints

The routes are shared across dashboard personas. The request and response
examples in this file describe the Product Owner main view.

## 1) Single-metric endpoint

- **Method:** `POST`
- **Path:** `/api/dashboard/metrics`

Use this for compact card/callout/bar metrics.

### Request JSON

```json
{
  "dashboard": "product-owner",
  "sections": ["product-experience-pulse", "trust-and-measurement-readiness"],
  "metrics": [
    "session-query-volume",
    "api-error-rate",
    "end-to-end-latency-p95",
    "workflow-completion",
    "safety-evaluators",
    "mlflow-safety-score",
    "pii-leakage-agent-only",
    "upia"
  ],
  "filters": {
    "timeRange": {
      "type": "relative",
      "value": "last_30_days"
    },
    "businessUnits": ["all"],
    "projects": ["all"],
    "timezone": "UTC"
  },
  "options": {
    "includePending": true,
    "includeCoverage": true
  }
}
```

### Response JSON

```json
{
  "meta": {
    "dashboard": "product-owner",
    "requestId": "f4ac06a2-6f31-42f7-a275-6c5aa91b8f60",
    "generatedAt": "2026-09-01T12:20:44Z",
    "appliedFilters": {
      "timeRange": "last_30_days",
      "businessUnits": ["all"],
      "projects": ["all"],
      "timezone": "UTC"
    }
  },
  "metrics": [
    {
      "metricId": "session-query-volume",
      "status": "OK",
      "value": {
        "queries": 316020,
        "sessions": 68700,
        "queriesPerSession": 4.6
      }
    },
    {
      "metricId": "api-error-rate",
      "section": "product-experience-pulse",
      "status": "CALCULATION_PENDING",
      "reason": "Error classification and eligible-request rules not finalized",
      "value": null
    },
    {
      "metricId": "workflow-completion",
      "section": "product-experience-pulse",
      "status": "DATA_PENDING",
      "reason": "Completion event and formula not supplied",
      "value": null
    },
    {
      "metricId": "mlflow-safety-score",
      "section": "trust-and-measurement-readiness",
      "status": "OK",
      "value": {
        "score": 0.91,
        "scaleMax": 1
      }
    },
    {
      "metricId": "upia",
      "section": "trust-and-measurement-readiness",
      "status": "CALCULATION_PENDING",
      "reason": "Test result contract not finalized",
      "value": null
    }
  ],
  "partialErrors": [
    {
      "metricId": "pii-leakage-agent-only",
      "status": "FILTER_BREAKDOWN_UNAVAILABLE",
      "reason": "Selected filters cannot be reliably attributed"
    }
  ]
}
```

### API Error Rate handoff

The Product Experience Pulse now uses API Error Rate instead of User
Satisfaction Rate. The implemented React component expects one processed
aggregate from Splunk; React does not classify statuses, join request events,
remove retries, or calculate the percentage.

The source mapping documents `status_code`, `error_code (API)`,
`response_status`, and `error_message (API)`. The request telemetry also
documents `request_id` and `timestamp`. `error_message (API)` is diagnostic
evidence only and must not be returned to the Product Owner dashboard.

The current proposed calculation is:

```text
eligible_request_count =
  COUNT(DISTINCT request_id)
  where the final response_status is "success" or "error"

error_request_count =
  COUNT(DISTINCT request_id)
  where the final response_status is "error"

api_error_rate_percent =
  error_request_count / eligible_request_count * 100
```

Splunk applies the selected time range, business unit, and project before the
aggregation, applies the approved final-outcome rule, and handles retries and
duplicates. `status_code` and `error_code (API)` may support normalization but
must not cause one failed request to be counted more than once.

The following rules remain unapproved: whether timeouts, content-filtered
responses, HTTP `4xx`, `5xx`, or `429` outcomes enter the numerator or
denominator; which timestamp controls period inclusion; and whether every
selected scope can be attributed. Until those rules are confirmed, return
`CALCULATION_PENDING`. If the rules are valid but there are no eligible
requests, return `NO_DATA`, not zero. If a selected filter cannot be honored,
return `FILTER_BREAKDOWN_UNAVAILABLE`.

After the calculation is approved, the `OK` value supplied to the implemented
component has this shape:

```json
{
  "metricId": "api-error-rate",
  "section": "product-experience-pulse",
  "status": "OK",
  "value": {
    "errorRatePercent": 1.14,
    "errorRequestCount": 114,
    "eligibleRequestCount": 10000
  }
}
```

The numbers above mirror the current illustrative UI state. They are not
production telemetry, an approved threshold, or a decision-ready result.

## 2) Timeseries endpoint

- **Method:** `POST`
- **Path:** `/api/dashboard/timeseries`

Use this for chart payloads only. Call once per chart family (for example Adoption/Engagement vs Experience/Quality).

### Request JSON

```json
{
  "dashboard": "product-owner",
  "chartId": "adoption-and-engagement",
  "metrics": ["sessions", "queries"],
  "filters": {
    "timeRange": {
      "type": "relative",
      "value": "last_30_days"
    },
    "businessUnits": ["all"],
    "projects": ["all"],
    "timezone": "UTC"
  },
  "granularity": "day",
  "options": {
    "includeSupportingStats": true
  }
}
```

### Response JSON

```json
{
  "meta": {
    "dashboard": "product-owner",
    "chartId": "adoption-and-engagement",
    "requestId": "2fdd6dc1-c267-4472-8311-56fd52f35b99",
    "generatedAt": "2026-09-01T12:20:44Z",
    "granularity": "day"
  },
  "series": [
    {
      "metricId": "sessions",
      "status": "OK",
      "points": [
        { "x": "2026-08-03", "y": 15000 },
        { "x": "2026-08-04", "y": 14000 }
      ]
    },
    {
      "metricId": "queries",
      "status": "OK",
      "points": [
        { "x": "2026-08-03", "y": 12000 },
        { "x": "2026-08-04", "y": 16000 }
      ]
    }
  ],
  "supportingStats": [
    {
      "metricId": "queries-per-session",
      "status": "OK",
      "value": 4.6
    },
    {
      "metricId": "avg-session-duration-minutes",
      "status": "OK",
      "value": 8.2
    }
  ]
}
```

## Status values (both endpoints)

- `OK`
- `DATA_PENDING`
- `CALCULATION_PENDING`
- `FILTER_BREAKDOWN_UNAVAILABLE`
- `NO_DATA`
- `ERROR`
