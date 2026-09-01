# Shared Dashboard Endpoint Strategy

## Goal

Provide a reusable API pattern for all dashboard personas that is efficient, consistent, and resilient to partial data availability.

## Strategy Summary

We use two shared endpoints:

1. `POST /api/dashboard/metrics`
2. `POST /api/dashboard/timeseries`

This separates lightweight single-value metrics from heavier chart datasets.

## Why We Chose This

1. Efficiency for main-page cards
   A single metrics request can fetch many small values at once (for example Product Experience Pulse, Trust and Measurement Readiness, and Channel Mix) with low payload overhead.

2. Better performance for charts
   Timeseries responses are larger and more compute-heavy. Keeping them separate avoids slowing card/callout rendering.

3. Reuse across dashboards
   Both endpoints are persona-agnostic. Dashboards specify what they need using `dashboard`, `sections`, `metrics`, and filters, instead of requiring persona-specific routes.

4. Failure isolation
   A failure in one chart request should not block compact metrics. A single bad metric should not fail the full metrics response.

5. Honest data-state handling
   The response uses explicit statuses (`DATA_PENDING`, `CALCULATION_PENDING`, `FILTER_BREAKDOWN_UNAVAILABLE`, etc.) so UI never invents values or substitutes zero for unavailable metrics.

## Channel Mix Decision

Channel Mix is currently a compact snapshot (four values), so it is included in `POST /api/dashboard/metrics`.

Keep it there unless it evolves into a larger time-bucketed dataset with different latency/cache requirements.

## Contract Principles

1. Shared filter semantics
   Time range, business unit, project, and channel filters are passed consistently to both endpoints.

2. Per-metric status model
   Each metric/series carries its own status and reason to support partial rendering.

3. Response metadata
   Each response includes request metadata (request ID, generation time, applied filters) for traceability.

## Scope of This Version

This strategy covers main-page data loading contracts. It does not yet define:

1. Final Splunk field mappings
2. Final SPL query templates
3. Drawer-specific payload contracts
4. Caching and SLA targets

These will be added in the next contract stage.
