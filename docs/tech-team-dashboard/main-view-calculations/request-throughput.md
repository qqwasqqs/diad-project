# Request Throughput — Short Version

## Element shown in the approved main view

| Property | Value |
|---|---|
| Section | Request-path health |
| Statistic | Request Throughput |
| Illustrative value | `42.8 req/s` |
| Scope | Last 30 days, business unit, project, channel |

The value is illustrative; it is not a target or capacity limit.

## Persona and KPI support

| Item | Confirmed definition |
|---|---|
| Persona | Technical Teams |
| Classification / category | Performance / Throughput |
| Source | UI Layer and Backend API |
| Fields | `request_id`, `timestamp`, `session_id` |
| Documented calculation | `COUNT(DISTINCT request_id in time window) / seconds in time window` |

`request_id` identifies a request; `timestamp` allocates it to a time window. `session_id` is not part of the rate numerator.

## Business meaning and calculation

Request Throughput answers: **How many distinct eligible requests did the selected scope handle per second?**

```text
requests_in_window = COUNT(DISTINCT request_id)
throughput_req_s   = requests_in_window / window_seconds
display_value      = round(throughput_req_s, 1) + " req/s"
```

Example: `154,080` distinct requests in a 3,600-second hour gives `42.8 req/s`. For a 30-day headline, the product must state whether it is total requests divided by all elapsed seconds, an average of fixed bucket rates, or a latest bucket rate; the approved image does not decide this.

## Recommended eligible population

- Use one approved request key across UI and backend events; choose one source of record or deduplicate correlated duplicates.
- Count each request once in its approved timestamp window. Decide how retries, abandoned requests, and partial telemetry behave.
- Exclude records without a usable identifier/timestamp and expose coverage as a telemetry gap.

## Assumptions and client questions

Assumptions: the illustrated headline is a period-average rate; Splunk/API applies filters and deduplication; no threshold is implied.

Questions: Which source and timestamp are authoritative? Is the headline an elapsed-period rate, bucket-rate average, or peak/latest rate? What exact time window and timezone apply? How are retries and cross-source duplicates handled? Can business-unit, project, and channel be attributed to every request?
