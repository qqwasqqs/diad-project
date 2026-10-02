# Technical Teams dashboard — data wiring

## Purpose

The Product Owner main view was migrated onto the shared dashboard endpoints
(`POST /api/dashboard/metrics`, `POST /api/dashboard/timeseries`) first. The
Technical Teams main view has now followed it, and the shared contract those two
endpoints speak has been generalized to carry more than one dashboard.

This document records how the data arrives today, what changed to get there, and
what is still blocked.

It supersedes the source-selection and Product-Owner-only sections of
[the earlier implemented-architecture note](./dashboard-data-architecture-implemented.md).
Written against the working tree on 2026-10-01.

## Part 1 — How a dashboard's data arrives

Both dashboards now take the same path. Only the request they build and the
adapter they return through differ.

```text
app/home/<dashboard>/page.tsx
  reads the selected scope from hooks/useSelectedDashboardFilters.ts
  -> hooks/use<Dashboard>DashboardEndpoints.ts
       one composition hook -> three independent React Query resources
         metrics, and one timeseries resource per chart family
  -> lib/services/<dashboard>DashboardEndpointService.ts
       picks this dashboard's metric IDs and chart metrics, builds the request DTO
  -> lib/services/dashboardFilterRequest.ts      (shared scope -> filter DTO)
  -> lib/services/dashboardEndpointService.ts    (shared transport, POST only)
  -> app/api/dashboard/{metrics,timeseries}/route.ts
  -> lib/server/dashboard/dashboardRequestParsers.ts   (validates the contract)
  -> lib/server/dashboard/dashboardDataSource.ts       (source, then dashboard)
       DASHBOARD_DATA_SOURCE=mock  -> <dashboard>DemoSource.ts
       unset or "splunk"           -> dashboardSplunkSource.ts
  -> back through the transport
  -> lib/dashboard/<dashboard>EndpointAdapter.ts  (pure DTO -> view model)
  -> page renders OK / DATA_PENDING / CALCULATION_PENDING /
     FILTER_BREAKDOWN_UNAVAILABLE / NO_DATA / ERROR per metric
```

### What each environment does today

`DASHBOARD_DATA_SOURCE` selects the source and defaults to `splunk` when unset.

| Setting | Metrics | Timeseries |
| --- | --- | --- |
| `mock` | Local fixtures, every response marked `illustrative` | Local fixtures, same |
| unset or `splunk` — Product Owner | The stage-1 connectivity probe runs `\| savedsearch consolidated_metric_final` over a fixed 30-day portfolio-wide window, logs the raw response, and returns every requested metric as `FILTER_BREAKDOWN_UNAVAILABLE` | HTTP 501 |
| unset or `splunk` — Technical Teams | HTTP 501; no saved search is approved for it | HTTP 501 |

Local development therefore needs `DASHBOARD_DATA_SOURCE=mock` in `.env`. It is
documented in `.env.example`. Without it both dashboards show their explicit
unavailable states rather than fixtures — which is the intended deployed
behavior, and not what you want while designing a page.

`NEXT_PUBLIC_LOCAL_DESIGN_MODE` is unrelated to this choice. It still controls
the older combined main-view routes, which now serve drawer provenance only.

### Sections still outside the endpoint contract

| Dashboard | Section | Source |
| --- | --- | --- |
| Product Owner | Feedback Summary, Feature Usage Evidence, Trust and Measurement Readiness | `GET /api/product-owner-dashboard/main-view` |
| Product Owner | Channel Mix | A local array in the page |
| Product Owner | All five drawers | Mock JSON imported by the page |
| Technical Teams | All six drawers' provenance (prose, context rows, decisions) | `GET /api/tech-team-dashboard/main-view` |

The Technical Teams drawers take their *numbers* from the endpoint models the
panels use, so a metric shown in a panel and in its drawer cannot read
differently. Only the provenance around those numbers still comes from the
combined route.

## Part 2 — What changed

### The shared contract now carries more than one dashboard

- `DashboardId` is `"product-owner" | "tech-team"`. Requests, responses, and meta
  are parameterized by it, and each dashboard's adapter rejects a response
  labelled with another dashboard.
- Technical Teams identifiers were added from its
  [Splunk data contract](../endpoints/tech-team-dashboard-splunk-data-contract.md):
  four sections, 21 metric IDs, and the two chart families.
- The eight Failure Localization rates are eight separate metric IDs, because
  each has its own denominator and record grain.

### Request validation is real again

`lib/server/dashboard/dashboardRequestParsers.ts` replaces the validation that
had been disabled inside the Product Owner local provider. It validates what is
contractual — dashboard, sections, metric and chart identifiers, time range,
granularity, timezone — and deliberately does not allow-list business unit,
project, or app *values*: those are data served to the filter bar by
`/api/dashboard/filters`, and allow-listing the demo's own values is what
rejected real deployed filters with HTTP 400 before.

Filter values are still constrained in form. Each is length-bounded and matched
against a conservative character set, because these values travel toward
saved-search arguments and an unchecked one must never reach SPL.

### The `app` dimension is no longer dropped

The filter bar has offered an application filter that never reached the request:
`toEndpointFilters` mapped only period, business unit, and project. `apps` is now
part of the filter DTO, both dashboards send it, and selecting an application
changes the numbers. A request that omits `apps` is still accepted and read as
the unfiltered scope.

### The Splunk boundary no longer overstates what it did

`meta.appliedFilters` now reports the scope the probe actually applied — the last
30 days, portfolio-wide — instead of echoing the requested scope back. Every
requested metric returns `FILTER_BREAKDOWN_UNAVAILABLE` with the reason, rather
than an empty metric list that the page could only describe as "not returned".

### The UI vocabulary can express every endpoint status

`PendingState` gained `no-data` and `unavailable`. The endpoint has six
availability statuses and the UI could previously render four of them; `NO_DATA`
(an approved definition with no eligible records) and `ERROR` had no distinct
display and would have been shown as "DATA PENDING". `lib/dashboard/availabilityState.ts`
holds the one mapping from status to state.

### Technical Teams files added

| Concern | File |
| --- | --- |
| View models | [types/techTeamDashboardModels.ts](../../types/techTeamDashboardModels.ts) |
| DTO to model | [lib/dashboard/techTeamEndpointAdapter.ts](../../lib/dashboard/techTeamEndpointAdapter.ts) |
| Request construction | [lib/services/techTeamDashboardEndpointService.ts](../../lib/services/techTeamDashboardEndpointService.ts) |
| Resource and composition hooks | [hooks/useTechTeamDashboardEndpoints.ts](../../hooks/useTechTeamDashboardEndpoints.ts) |
| Local provider | [lib/server/dashboard/techTeamDemoSource.ts](../../lib/server/dashboard/techTeamDemoSource.ts) |
| Shared adapter guards | [lib/dashboard/endpointAdapterGuards.ts](../../lib/dashboard/endpointAdapterGuards.ts) |
| Shared scope conversion | [lib/services/dashboardFilterRequest.ts](../../lib/services/dashboardFilterRequest.ts) |
| Status to display state | [lib/dashboard/availabilityState.ts](../../lib/dashboard/availabilityState.ts) |

### Technical Teams page

- One combined payload with one loading state became three resources: the
  latency chart, the quality chart, and one metrics request for the 21 values in
  the four non-chart panels. A failing chart no longer blanks the panels around
  it.
- Formatting moved out of the API route and into the page. The route used to
  return finished display strings; the endpoint returns numbers with settled
  units (durations in milliseconds, rates as percentages, cost with its currency,
  bounded scores with their scale) and the page decides how to print them.
- Series colours are assigned per series ID rather than by position, so an
  unavailable series cannot shift the colour of the others.
- Failure Localization draws only the rates that were measured, takes its track
  bound from the rates themselves, and names the ones it could not draw
  underneath the chart. A bar chart can only draw a number, so an unavailable
  rate would otherwise just be missing.

### What the local fixture now reports

The fixture keeps the values the approved design shows. Its own identifiers and
its `pendingState` vocabulary are translated to the contract's metric IDs and
availability statuses by the provider, which is where that translation belongs.

| Metric | Local status |
| --- | --- |
| Request Throughput, Inference Error Rate, Pipeline Duration, Indexing / AI Services, the eight failure rates, Cost per Request, Token Usage / Request, MLflow Safety Score | `OK`, illustrative |
| Token Throughput, Available Token Limit, Cache Hit Ratio, Safety Evaluation Score, UPIA | `CALCULATION_PENDING` |
| PII Leakage (Agent Only) | `DATA_PENDING` |

The six metrics with no approved numeric aggregation have no `OK` variant in the
view model at all, so a source that sends a number for one of them is rejected by
the adapter rather than displayed. Adding an approved value for one of them is a
deliberate model change, not a silent source change.

### Conformance to the Technical Teams data contract

The identifiers and value fields are taken from
[the Technical Teams Splunk data contract](../endpoints/tech-team-dashboard-splunk-data-contract.md)
and the per-metric
[main-view calculation documents](../tech-team-dashboard/main-view-calculations/),
not inferred from the Product Owner implementation. Four points where the two
dashboards differ, and where following the Product Owner shape would have been
wrong:

1. **Five section IDs, not four.** The contract lists `ai-model-quality`
   alongside the four sections that contain metrics. A metrics request never
   carries it — that section's values are a chart and its period-level
   supporting stats — but it is part of the contract and is accepted.

2. **The derivation counts are part of the contract.** The contract's output
   aliases include `error_count` and `eligible_count`, `run_count`,
   `request_count` and `window_seconds`, `total_request_cost`, `total_tokens`,
   and per-workload `failed_count`/`eligible_count`. The view model carries all
   of them, optional and validated when present: they are what a rate was
   derived from, the approved main view does not show them yet, and the local
   fixture has no approved values for them.

3. **The failure-rate track bound is presentation, not data.** The fixture
   carries a `scaleMax` for the bar chart and the contract defines no scale for
   these rates. It therefore does not travel on the wire or appear in the view
   model; the page sets the bound and widens it if a measured rate would
   overflow it.

4. **The specific pending labels are preserved.** The approved design displays
   `DEFINITION PENDING` for Token Throughput and Available Token Limit,
   `FORMULA PENDING` for Cache Hit Ratio, and `TEST RESULTS PENDING` for UPIA.
   The shared status vocabulary has no codes for these and the contract says so
   directly: the source returns `CALCULATION_PENDING` with a precise reason and
   the UI maps it back to the approved label. The page holds that mapping, and
   applies it only to `CALCULATION_PENDING` — a measure that comes back
   `NO_DATA`, in error, or unattributable to the selected scope states that
   instead.

Two things the contract documents still say that the code does not follow, both
deliberate:

- The contract lists **channel** among the filters to apply. The filter bar
  replaced channel with an **application** filter, so the request carries `apps`.
  The contract documents need updating to match.
- The Product Owner executable metric set still differs from its own contract
  document — it requests `api-error-rate`, which that document does not list,
  and does not request `user-satisfaction-rate`, which it does. That
  pre-existing mismatch was noted in the earlier implemented-architecture note
  and is untouched here.

## Part 3 — What is still blocked

### Stage E — the live Splunk source

Blocked on the external contract, now needed per dashboard:

1. Saved-search names and routing for each dashboard's metrics request and each
   `chartId`.
2. Azure Function argument names for `timeRange`, `businessUnits`, `projects`,
   `apps`, and `timezone`.
3. Encoding for the array-valued filters.
4. Confirmation that the Function forwards those arguments to saved-search
   placeholders.
5. Approved result aliases. The Technical Teams contract already names them —
   `error_count`, `eligible_count`, `error_rate_percent`, `average_duration_ms`,
   `total_request_cost`, `average_cost_per_request`, `currency_code`,
   `average_tokens_per_request`, `mlflow_safety_score`, `scale_max`, and
   per-workload `failed_count`/`eligible_count`.

Then: a saved-search routing table and one server-side mapper per dashboard from
raw rows to the response DTOs. `scripts/splunk-probe.mjs` is the tool for taking
the field inventory the mapper has to be written against.

Roughly half the Technical Teams surface will keep showing explicit pending
states after that work, because the contract says those measures have no
approved definition yet. That is the intended outcome, not an incomplete
migration.

### Stage F — drawers

Decide per drawer whether to reuse the main-view query cache or add a lazy detail
query, and extend the DTOs only for confirmed drawer fields. Until then both
dashboards keep their combined main-view route for provenance only.

## Validation performed

- `npx tsc --noEmit` clean.
- `npx eslint` clean on every added or changed file.
- The server modules exercised directly: contract validation accepts a valid
  request and rejects an unknown dashboard, an unknown metric, an unsupported
  time range, a non-UTC timezone, and a filter value carrying SPL punctuation;
  a request without `apps` is accepted and duplicate metrics are deduplicated.
- Technical Teams metrics and both chart families returned from the local
  provider, adapted to view models, with a 7-day request returning seven points
  per series and the fixture's values preserved.
- Application scoping confirmed to change the returned values and to be reported
  in `meta.appliedFilters`.
- Product Owner metrics re-checked under a narrowed business unit and project,
  unchanged by the migration.
- Over HTTP against a running dev server: an unknown metric returns 400, and
  Technical Teams metrics and timeseries on the Splunk source return 501 with the
  missing-contract detail. The page itself renders.
- Contract conformance re-checked against the Technical Teams data contract and
  the per-metric calculation documents: all five section IDs accepted; a
  response carrying the contract's derivation counts is preserved through the
  adapter; a malformed count is rejected; no invented `scaleMax` on the wire.

The approved pending labels are covered by the type system and by the mapping
table reading directly from each metric's calculation document. They were not
confirmed in a rendered page, because the dev server available during this work
runs on the Splunk source, where every panel shows its request state instead.

No deployment was performed.
