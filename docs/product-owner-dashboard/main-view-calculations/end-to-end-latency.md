# End-to-End Latency — Shared Canonical Definition

## Elements shown in the approved main view

`End-to-End Latency — P95 1.20 s` appears in both the Product experience pulse card and the Experience and response quality callout. They must use one value, not separately aggregated results.

## Canonical shared specification

The exact metric, fields, P95 calculation, eligible population, verification tests, and client questions are reused from the approved Operations specification: [End-to-End Latency](../../operations-team-dashboard/main-view-calculations/end-to-end-latency.md).

Confirmed metric support is UI Layer `timestamp_start`, `timestamp_end`, and `response_latency_ms`, with documented `AVG(response_latency_ms)` or `P95(response_latency_ms)`. This Product Owner view selects P95.

```text
card_p95_ms = P95(eligible, deduplicated request-level response_latency_ms)
display      = round(card_p95_ms / 1000, 2) + " s"
```

## Product Owner presentation note

P95 answers the user-experience speed question: **how long did 95% of eligible user requests take from submission through final rendering?** It is adjacent to satisfaction as a decision aid only. The image explicitly says `Adjacent signals — no causal claim`; no correlation, causal effect, or shared population has been documented.

The illustrative `P95 1.20 s` is not a target, breach, or approved good/bad state. If selected dimensions cannot be attributed, use the canonical `FILTER BREAKDOWN UNAVAILABLE`/no-data behavior.
