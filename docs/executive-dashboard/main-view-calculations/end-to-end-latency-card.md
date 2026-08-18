# End-to-End Latency Card Calculation

## Document status and scope

This document defines the proposed calculation and implementation contract for the **End-to-End Latency** card in the **Executive pulse** section of the Executive Dashboard.

It covers the main-view KPI card only. The expanded latency view is documented separately in [Executive Dashboard Latency Details](../executive-dashboard-latency-details.md).

The calculation is supported by the current design documentation, but the production Splunk query, API contract, filtering rules, status-inclusion policy, percentile method, and target thresholds still require client confirmation.

![Executive Dashboard concept](../executive-dashboard-concept-01.png)

## Card shown in the concept

| Property | Concept value |
|---|---|
| Section | Executive pulse |
| Card | End-to-End Latency |
| Statistic | P95 |
| Illustrative display value | `1.20 s` |
| Visible dashboard scope | Last 30 days, business unit, project, and channel |

The value is illustrative. The concept banner states that targets and thresholds are pending validation. The card's green icon must therefore not be interpreted as a confirmed healthy status.

## 1. Confirmed facts

### Persona and KPI support

The Executive persona KPI mapping defines:

| Item | Confirmed definition |
|---|---|
| Classification | Performance |
| KPI category | Latency |
| Metric | End-to-End Latency |
| Source | UI Layer |
| Key fields | `timestamp_start`, `timestamp_end`, `response_latency_ms` |
| Supported aggregations | `AVG(response_latency_ms)` or `P95(response_latency_ms)` |

The concept explicitly selects **P95**, not average.

### Timing semantics

The field mapping describes:

- `timestamp_start` as the UI time when the user submits the request;
- `timestamp_end` as the UI time when the final response is received and rendered;
- `response_latency_ms` as the UI-measured request duration in milliseconds.

The detailed observability design also defines a mandatory UI `response_returned` event with `correlation_id`, event `timestamp`, `response_latency_ms`, `response_status`, and status/error fields.

The UI `Request Received` event separately includes `correlation_id`, `request_id`, event `timestamp`, project, application, environment, user/session, and business-unit fields.

### Architecture boundary

Telemetry is ingested, normalized, enriched, and correlated in Splunk. The React dashboard consumes results through Splunk REST APIs. Therefore, the percentile calculation should normally be performed in Splunk or an approved backend/API layer. The React card should format and display the returned aggregate rather than calculate P95 from raw request events in the browser.

## 2. Likely interpretation and proposed calculation

### Business meaning

P95 End-to-End Latency answers:

> Within the selected scope and time period, how long did 95% of eligible user requests take from UI submission until the final response was rendered?

A displayed value of `P95 1.20 s` means that 95% of eligible requests completed in **1.20 seconds or less**, while the slowest 5% took longer. It does not mean that the average request took 1.20 seconds.

### Per-request calculation

For each request:

```text
response_latency_ms = timestamp_end - timestamp_start
```

Recommended UI instrumentation:

1. Start a monotonic timer when the user submits the request.
2. Stop the timer after the final response has been rendered.
3. Store the elapsed duration as `response_latency_ms`.
4. Also record UTC event timestamps for traceability and validation.
5. Emit one terminal `response_returned` event for the request.

A monotonic timer is recommended for elapsed duration because it is not affected by a user changing the device clock while the request is in progress.

### Card aggregation

For the eligible requests remaining after the selected filters are applied:

```text
card_value_ms = P95(response_latency_ms)
card_value_s  = card_value_ms / 1000
display_value = round(card_value_s, 2) + " s"
```

The percentile must be calculated from request-level latency values. It must not be calculated from averages already grouped by day, project, business unit, or channel.

### Recommended eligible population

The following is an implementation recommendation, not yet a confirmed client rule:

- Use one terminal UI event per request.
- Include requests with `response_status = success` in the primary latency card.
- Report errors and timeouts through the adjacent API Error Rate card.
- Do not silently include or exclude `content_filtered`, cancelled, abandoned, or timed-out requests; obtain a client decision for each status.
- Exclude missing, non-numeric, negative, or otherwise invalid `response_latency_ms` values and count them as telemetry-quality exceptions.
- Deduplicate retry or duplicate terminal events before calculating the percentile.

Using successful requests for the primary latency card avoids mixing response performance with failures. However, excluding failures can make performance look better, so the error-rate card should remain visible and the data contract should expose the latency sample count or telemetry-quality state.

### Filter application

The concept shows time-period, business-unit, project, and channel filters. These filters must be applied to the eligible request population **before** P95 is calculated.

The preferred normalized terminal event would contain or be enriched with:

| Field | Purpose | Current evidence |
|---|---|---|
| `correlation_id` | Correlate request and response telemetry | Confirmed on both UI events |
| `request_id` | Define and deduplicate the request grain | Confirmed on the request event; not confirmed on `response_returned` |
| `response_latency_ms` | Request-level latency value | Confirmed on `response_returned` |
| `response_status` | Apply the approved inclusion policy | Confirmed on `response_returned` |
| start and end timestamps | Derive or validate elapsed time | Conceptually confirmed; detailed event tables use a generic `timestamp` on separate events |
| business-unit field | Apply the business-unit filter | Confirmed on the request event; not confirmed on `response_returned` |
| `project_name` | Apply the project filter | Confirmed on the request event; not confirmed on `response_returned` |
| `channel` | Apply the channel filter | Present in the generic KPI mapping; not confirmed in the detailed UI event schema |
| `environment` | Prevent mixing production and non-production traffic | Confirmed on the request event; not confirmed on `response_returned` |
| ingestion or freshness timestamp | Detect delayed or stale telemetry | Not confirmed |

The preferred implementation is to enrich the terminal record in Splunk with the required dimensions. If that is not available, Splunk must correlate the request and response events using an approved request identifier before applying filters. This should be implemented as an approved saved search, data model, or normalization step rather than rebuilt by each dashboard request.

### Field that must not be used

An additional spreadsheet cell outside the main Executive persona table contains `AVG(model_latency_ms) or P95(model_latency_ms)`. This conflicts with the main End-to-End Latency mapping and describes model-only latency.

`model_latency_ms` must not power this Executive card. It excludes UI, network, backend, retrieval, orchestration, rendering, and other request-path time. The main mapping and detailed design both identify UI `response_latency_ms` as the appropriate end-to-end field.

## 3. Worked examples

### Example A: calculate one request

```text
Request submitted:       10:00:00.000
Final response rendered: 10:00:01.200

response_latency_ms = 10:00:01.200 - 10:00:00.000
                    = 1,200 ms
                    = 1.20 s
```

This produces one request-level input value of `1200` milliseconds. It does not by itself establish the card's P95; the card requires the complete eligible request population for the selected scope.

### Example B: calculate the illustrative P95

Assume the selected scope contains these 20 valid request latencies, sorted in ascending order:

```text
420, 450, 470, 500, 520,
550, 580, 600, 620, 650,
680, 700, 730, 760, 800,
850, 900, 980, 1200, 1800 ms
```

Using the nearest-rank example method:

```text
rank = ceiling(0.95 * 20)
     = 19

P95 = value at rank 19
    = 1,200 ms
    = 1.20 s
```

The exact percentile algorithm must match the client-approved Splunk function. Some functions interpolate between observations and may return a different value for a small sample. The production dashboard, validation tests, and exports must all use the same method.

### Example C: display formatting

```javascript
function formatLatencyMs(valueMs) {
  if (!Number.isFinite(valueMs) || valueMs < 0) return null;
  return `${(valueMs / 1000).toFixed(2)} s`;
}

formatLatencyMs(1200); // "1.20 s"
```

This frontend function formats a value already calculated by the data layer. It does not calculate P95.

## 4. Proposed data-layer query outline

The actual Splunk index, source type, field aliases, macros, access filters, and saved-search names are not documented. The following is illustrative logic only:

```spl
<approved base search for normalized UI response events>
| search event_name="response_returned"
| where response_status="success"
    AND isnum(response_latency_ms)
    AND response_latency_ms>=0
| <apply authorized time, business-unit, project, channel, and environment filters>
| <retain one approved terminal record per request>
| stats perc95(response_latency_ms) AS p95_latency_ms
        count AS sample_count
| eval p95_latency_s=round(p95_latency_ms/1000, 2)
```

The exact `perc95` behavior must be verified against the approved percentile definition. If the terminal event is not already enriched with filter dimensions, the base search must first correlate it with the initial UI request event.

## 5. Proposed dashboard API contract

The following TypeScript shape is an implementation proposal. It is not a confirmed Splunk REST or application endpoint contract.

```typescript
type EndToEndLatencyCardResult = {
  metric: "end_to_end_latency";
  statistic: "p95";
  valueMs: number | null;
  sampleCount: number;
  windowStart: string;
  windowEnd: string;
  filtersApplied: {
    businessUnit?: string;
    project?: string;
    channel?: string;
    environment?: string;
  };
  dataStatus:
    | "available"
    | "loading"
    | "no_data"
    | "data_pending"
    | "stale"
    | "error";
  dataAsOf?: string;
  thresholdStatus?:
    | "not_configured"
    | "within_target"
    | "attention"
    | "critical";
};
```

Recommended responsibility split:

| Layer | Responsibility |
|---|---|
| Producer UI | Measure and emit request-level latency and terminal status |
| Event Hub / ingestion | Transport telemetry without changing its meaning |
| Splunk normalization | Validate fields, correlate events, enrich dimensions, and deduplicate |
| Splunk saved search or approved API layer | Apply authorization and filters; calculate P95 and sample count |
| React/Next.js dashboard | Request the aggregate, render states, convert milliseconds to seconds, and display the value |

## 6. Assumptions

- `response_latency_ms` is numeric and consistently represents milliseconds.
- One approved request identifier can connect the initial UI event with its terminal UI event.
- The card displays P95 across individual eligible requests.
- The selected period and global filters are applied before aggregation.
- The concept's `Last 30 days` scope is a design proposal until the client approves the default period.
- The primary card will use successful requests unless the client chooses a broader terminal-status policy.
- Final-response rendering, rather than first-token arrival, is the intended end point.
- Splunk or an approved API layer, rather than the browser, owns the production percentile calculation.
- All concept values and dates are illustrative.

## 7. Missing evidence and client input required

### Blocking calculation decisions

| Client decision or evidence needed | Why it is required |
|---|---|
| Approved start and end events | Establishes whether the measure ends at first byte, first token, final token, response receipt, or final render |
| Streaming-response rule | Prevents time-to-first-token and time-to-final-render from being mixed |
| Eligible `response_status` values | Defines whether success, error, timeout, cancellation, abandonment, and content filtering enter the latency population |
| Request grain and canonical deduplication key | Prevents retries and duplicate terminal events from distorting P95 |
| Approved percentile function | Ensures Splunk, tests, exports, and explanatory text return the same P95 |
| Time-window cohort rule | Determines whether a request belongs to a period by submission or completion time |
| Timezone and boundary rules | Makes daily and period calculations repeatable |
| Business-unit, project, channel, and environment attribution contract | Determines whether the visible global filters can be applied correctly |
| Authorization/filtering behavior | Ensures executives see only permitted request populations |

### Telemetry and API evidence needed

- Actual Splunk index, source type, normalized field names, and field types.
- Confirmation that `response_latency_ms` is emitted for every in-scope application.
- Confirmation that `request_id` is propagated to `response_returned`, or an approved alternative correlation rule.
- Confirmation that the response event can be enriched with business unit, project, channel, and environment.
- Splunk saved-search or query contract, including percentile behavior.
- Splunk REST/API response schema, authentication, authorization, timeout, and error behavior.
- Refresh cadence and an ingestion/freshness timestamp.
- Expected telemetry coverage and minimum sample size for showing a percentile.
- Rules for invalid, missing, extreme, late, and duplicate latency events.
- Expected behavior when only part of a filtered population has usable latency telemetry.

### Presentation decisions needed

- Approved decimal precision and unit-switching behavior.
- Approved latency target and attention/critical thresholds.
- Whether the main card should show sample size, previous-period change, target, or freshness.
- Loading, empty, stale, API-error, and `Data Pending` behavior.
- Whether an unavailable filter dimension should produce `Data Pending`, an unavailable-filter message, or a portfolio-wide value with a warning.

Until thresholds are approved, the card should use a neutral state such as `thresholdStatus: "not_configured"`; green, amber, or red must not imply validated performance.

## 8. Risks and side effects

| Risk | Effect | Mitigation or verification |
|---|---|---|
| Using model latency instead of UI latency | Understates user-perceived delay | Compare the implementation with the approved `response_latency_ms` contract |
| Calculating P95 from daily averages | Produces a mathematically different result | Test against request-level samples |
| Excluding failures without disclosure | Makes latency appear artificially better | Approve the status policy and keep error metrics visible |
| Duplicate terminal events | Overweights retried or repeated requests | Deduplicate using the approved request grain |
| Missing attribution fields | Applies global filters inconsistently | Enrich terminal events or return an explicit unavailable state |
| Client clock changes or mixed clocks | Produces negative or inaccurate durations | Use a monotonic UI timer and UTC timestamps |
| Small samples | Makes P95 unstable | Return `sampleCount` and approve a minimum threshold |
| Unapproved green status | Communicates unsupported health | Use a neutral state until targets are approved |

## 9. Verification checklist

### Telemetry validation

- Confirm that a UI request produces one identifiable start event and one terminal response event.
- Confirm that the terminal event contains a numeric, non-negative `response_latency_ms`.
- Recalculate latency from correlated start/end timestamps and compare it with the emitted duration within an approved tolerance.
- Measure missing-field, duplicate-event, invalid-duration, and unmatched-correlation rates.
- Confirm final-render timing for streamed and non-streamed responses.

### Calculation validation

- Load a deterministic request-latency dataset with a known expected P95.
- Run the approved Splunk calculation and compare it with the expected result.
- Confirm that P95 is calculated after filters and deduplication.
- Confirm that it uses individual requests rather than pre-aggregated daily values.
- Verify the milliseconds-to-seconds conversion and two-decimal display rule.

### Filter, authorization, and UI validation

- Test portfolio, business-unit, project, channel, and environment scopes independently and in combination.
- Confirm that every filtered result uses only authorized telemetry.
- Confirm that unsupported attribution produces an explicit state rather than an unfiltered value.
- Verify available, loading, no-data, `Data Pending`, stale, and API-error states.
- Verify that a missing threshold produces a neutral state.
- Verify that the concept's `1.20 s` placeholder cannot appear as live data when telemetry is unavailable.

## Source references

- [Executive Dashboard Concept 01](../executive-dashboard-concept-01.md)
- [Executive Persona KPI Mapping](../../../business-logic/persona-kpi-mapping-executives.md)
- [Dashboard and Reporting Design](../../../business-logic/dashboard-and-reporting-design.md)
- [AI Observability Design](../../../business-logic/ai-observability-design.md)
- [Consolidated Observability Business Logic](../../../business-logic/observability-business-logic.md)
