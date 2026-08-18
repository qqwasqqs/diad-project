# Global Filters and Illustrative State — Short Version

## Element shown in the approved main view

`Last 30 days`, `All business units`, `All projects`, `All channels`, `Export`, and the banner `ILLUSTRATIVE VALUES — TARGETS AND THRESHOLDS PENDING VALIDATION` apply to every calculation-bearing Product Owner element.

## Confirmed support

The procedure establishes a 30-day default and the image preserves the shared filter order. The Product Owner mapping supplies `channel` on the session/adoption KPI and `business_unit`/`project_name` in separate ownership/cost rows, but does not establish a cross-source correlation contract for every shown metric.

## Proposed behavior

```text
eligible_records = metric-specific eligible population
  filtered by the selected time range
  and selected dimensions only when they are reliably attributable
```

Filters apply before each metric's own aggregation. If any selected dimension cannot be honored, return `FILTER BREAKDOWN UNAVAILABLE` or `DATA PENDING`; never show a portfolio-wide value as if it were filtered, and never substitute zero.

## Meaning, assumptions, and questions

The controls state the intended scope; the banner says values/colors are illustrative, not production facts or approved thresholds. Assume Splunk/an approved API applies filters and preserves scope into future in-persona detail views. `Export` is outside this calculation contract.

Confirm each metric timestamp/timezone; normalized field or correlation joins; partial-coverage, access, refresh, loading, empty, stale, API-error, and export rules; and thresholds that would permit changing the banner.
