# Global Filters and Illustrative-State Banner — Short Version

## Element shown in the approved main view

| Property | Value |
|---|---|
| Elements | `Last 30 days`, `All business units`, `All projects`, `All channels`, and the illustrative-values banner |
| Banner text | `ILLUSTRATIVE VALUES — TARGETS AND THRESHOLDS PENDING VALIDATION` |
| Applies to | Every calculation-bearing main-view element |

These are dashboard-wide calculation inputs and state labels, not metrics. The banner must remain visible while the image uses illustrative values.

## Persona and KPI support

| Item | Confirmed evidence |
|---|---|
| Persona | Technical Teams |
| Default period | Last 30 days |
| Global controls | The concept and approved image preserve the Executive Dashboard controls: period, business unit, project, and channel |
| Values/state | All numeric values are illustrative; targets and thresholds are pending validation |
| Backend boundary | React consumes observability data through Splunk REST APIs; producer attribution/correlation is not yet confirmed for every source |

## Field semantics, behavior, and aggregation

The time filter selects eligible event records using the metric’s approved timestamp and timezone. The business-unit, project, and channel filters apply only after an event is reliably attributed through an approved event field or Splunk correlation/enrichment rule.

```text
eligible_records = metric_population
  filtered by selected time range
  and only reliably attributable selected dimensions
```

No generic field names, join rules, timezone, reporting boundary, or partial-coverage rule are approved. The supplied mapping generally does not include business-unit, project, or channel fields; candidate sample-log aliases do not prove cross-source correlation.

## Business meaning

The controls answer: **Which data scope is this displayed calculation representing?** The banner answers: **Are the screen’s values and colors validated production facts?** For this concept, the answer is no—values are illustrative and color does not establish a threshold state.

## Recommended eligible population

- Apply each metric’s own eligibility, deduplication, and terminal-outcome rule before display.
- Do not return an unfiltered portfolio value when a selected dimension cannot be honored.
- Return `FILTER BREAKDOWN UNAVAILABLE` or `DATA PENDING` for an unsupported selected scope; never substitute zero.
- Preserve active filter context for any future in-persona detail view.

## Assumptions and client questions

Assumptions: 30 days is the initial default; Splunk/an approved API applies filters; the banner stays until validated values/targets are approved; `Export` is outside this calculation specification.

Questions: Which timestamp/timezone defines each metric’s range? What normalized fields or correlation joins provide the three dimensions? How should partially attributable results be represented? Do filters apply before or after metric-specific aggregation? What refresh/freshness, access-control, no-data, and export rules apply? Which approved thresholds permit removal or change of the illustrative banner?
