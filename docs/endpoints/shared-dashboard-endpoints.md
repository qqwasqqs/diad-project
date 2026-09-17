# Shared Dashboard Endpoints

These endpoints are shared across dashboards and are not scoped to a single persona route.

## 1) Single-metric endpoint

**Method**: `POST`  
**Path**: `/api/dashboard/metrics`

Use this for compact card/callout/bar metrics.

### Request JSON

```json
{
  "dashboard": "product-owner",
  "sections": ["product-experience-pulse", "trust-and-measurement-readiness"],
  "metrics": [
    "session-query-volume",
    "user-satisfaction-rate",
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

## 2) Timeseries endpoint

**Method**: `POST`  
**Path**: `/api/dashboard/timeseries`

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
