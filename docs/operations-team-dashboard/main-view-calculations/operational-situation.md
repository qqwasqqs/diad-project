# Operational Situation — Short Version

## Elements shown

| Item | Image treatment | Feasibility |
| --- | --- | --- |
| End-to-End Latency | `P95 1.20 s` card | Supported; illustrative value |
| API Error Rate | `1.14%` card | Derivable; illustrative value |
| Pipeline Failure Rate | `0.7%` card | Derivable; illustrative value |
| Alert feed | `THRESHOLD PENDING` card | Pending |
| Requested operations coverage | Uptime/SLA definition pending; CPU/memory and system-load data pending | Pending/partially supported |

## Confirmed facts

- End-to-End Latency uses `timestamp_start`, `timestamp_end`, and
  `response_latency_ms`; the mapping permits `AVG` or `P95`.
- API Error Rate uses HTTP/API status and error fields; its documented formula
  is AI-related error code divided by total request.
- Pipeline Failure Rate uses `status`, `failureType`, `triggered_by`, and
  `errorCode`; its documented formula is total error code divided by total
  request.
- `response_status` is described as feeding an uptime calculation, but no
  uptime/SLA formula is documented. No CPU, memory, load, alert event, alert
  rule, severity, or threshold fields are mapped.

## Calculation and aggregation

The same canonical End-to-End P95 displayed in the Service-path Stability chart
is reused here; it must not be calculated a second, incompatible way.

```text
end_to_end_ms = timestamp_end - timestamp_start
latency_card = P95(eligible, deduplicated response_latency_ms)

api_error_rate = distinct approved error requests /
                 distinct eligible requests * 100

pipeline_failure_rate = distinct approved failed pipeline runs /
                        distinct eligible pipeline runs * 100
```

Example only: 114 approved API-error requests among 10,000 eligible requests
displays `1.14%`; 7 failed pipeline runs among 1,000 eligible runs displays
`0.7%`. Values are not production data.

## Recommended eligible population

- Keep one terminal UI response per request for P95; reject missing, negative,
  or nonnumeric duration values as telemetry-quality gaps.
- Use one approved terminal outcome and canonical request key for API Error
  Rate. `error_message (API)` supports investigation only and is not displayed.
- Use one approved final `runId`/pipeline run per Pipeline Failure Rate. Do not
  count retry attempts or error fields twice without an approved rule.
- Do not calculate the Alert feed or requested-coverage items. They are explicit
  evidence-gap states, not zeros or operational-health claims.

## Likely interpretations

The group lets Operations immediately distinguish a measured illustrative
stability signal from requested monitoring coverage that is not yet contractually
implementable.

## Assumptions

- P95 represents slow-tail user-visible latency; it uses the selected scope and
  a client-approved percentile convention later.
- The initial API numerator is a canonical terminal `response_status = error`;
  timeouts, content-filtered, cancelled, and retried outcomes are unclassified
  until approved.
- A failed pipeline is determined from an approved final status/error taxonomy.

## Missing evidence and client questions

What is the API and pipeline denominator grain? How are retry, timeout,
cancelled, content-filtered, partial, and duplicate events handled? Which fields
produce uptime/SLA, CPU, memory, system load, alert feed, incident severity,
thresholds, acknowledgement, and resolution? What minimum sample and status
rules apply? Can every item honor each global filter?
