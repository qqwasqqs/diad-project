# Global Filters and Illustrative State — Short Version

## Element shown

`Last 30 days`, `All business units`, `All projects`, `All channels`, `Export`,
and the banner `ILLUSTRATIVE VALUES — TARGETS AND THRESHOLDS PENDING VALIDATION`.
These are dashboard-wide calculation inputs and state labels, not metrics.

## Confirmed facts

- The approved image preserves the exact shared filter order.
- The procedure's default period is 30 days.
- The mapping generally does not supply business-unit, project, or channel
  fields, and no join/correlation contract is supplied.

## Proposed behavior and aggregation

For a metric with an approved timestamp and attributable dimensions:

```text
eligible_records = metric-specific population
  filtered by selected time range
  and selected dimensions that can be reliably attributed
```

Filter before metric aggregation. If one selected dimension cannot be honored,
return `FILTER BREAKDOWN UNAVAILABLE` or `DATA PENDING`, never an unfiltered
portfolio value presented as scoped and never zero.

## Business meaning

The controls state the scope a value is intended to represent. The banner states
that values and color are illustrative design placeholders, not validated facts
or approved alert states.

## Assumptions

- Splunk/an approved API applies the filters and returns the explicit state.
- Active scope would persist to a future in-persona detail view.
- `Export` is outside the calculation contract.

## Missing evidence and client questions

Which timestamp/timezone defines each range? Which normalized fields or joins
provide the dimensions? How should partial coverage, access, refresh, loading,
empty, stale, API-error, and export states behave? Which approved thresholds
would permit changing the banner or status presentation?
