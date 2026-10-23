# Technical debt — Remove the dashboard mock data source

## Status

**Open.** The Product Owner dashboard currently supports two data sources:

- a local fixture-based provider selected with
  `DASHBOARD_DATA_SOURCE=mock`; and
- a Splunk provider selected with `DASHBOARD_DATA_SOURCE=splunk` or when the
  variable is unset.

The mock provider is useful for local UI development, but it is not a
production data source. Once the Splunk response contract is approved and live
data is stable, remove the mock pipeline rather than keeping two permanently
divergent implementations.

This document covers the shared dashboard endpoint pipeline used by the
Product Owner dashboard. It does **not** authorize deleting every JSON file
under `public/mocks`: the other dashboards and legacy routes may still depend
on their own fixtures until they are migrated separately.

Related hand-over documentation:

- [Product Owner dashboard data connection](./product-owner-dashboard-data-connection.md)
- [Dashboard structure](./dashboard-structure.md)
- [Splunk response failure technical debt](./technical-debt-splunk-response-failure.md)

---

## 1. What must be removed

The mock source branch consists of these pieces:

```text
DASHBOARD_DATA_SOURCE=mock
  -> lib/server/dashboard/dashboardDataSource.ts
    -> loadMockMetrics / loadMockTimeseries
      -> lib/server/dashboard/productOwnerDemoSource.ts
        -> public/mocks/new-pages/product-owner-dashboard.json
```

The cleanup must remove or replace:

1. the `mock` source-selection branch;
2. the Product Owner endpoint mock provider;
3. the endpoint fixture dependencies that are no longer needed;
4. mock-only response metadata such as `meta.illustrative`;
5. mock-only environment configuration and documentation; and
6. any remaining Product Owner page or drawer imports that bypass the live
   endpoint.

Do not remove the mock branch before the Splunk provider returns the same
page-facing contract. The current Splunk implementation intentionally throws
`DashboardSplunkContractError` after the connectivity call and returns HTTP
501; deleting the mock today would make local dashboard development fail.

---

## 2. Current state and target state

### Current state

The browser requests:

```text
Product Owner page
  -> useProductOwnerMainView
  -> productOwnerDashboardService
  -> dashboardEndpointService
  -> POST /api/dashboard/metrics or /api/dashboard/timeseries
  -> dashboardDataSource
      -> mock: productOwnerDemoSource + JSON fixture
      -> splunk: dashboardSplunkSource + splunkReportService
```

The mock metrics provider returns the
[Product Owner main-view fixture](../../public/mocks/new-pages/product-owner-dashboard.json)
unchanged. The mock timeseries provider reads the same fixture and converts its
chart entries into endpoint response envelopes.

The Splunk provider currently:

- calls `postSplunkQuery` with the saved search
  `| savedsearch consolidated_metric_final`;
- uses a fixed 30-day range;
- does not forward the requested dashboard filters;
- logs the raw response; and
- throws `DashboardSplunkContractError` instead of returning mapped data.

### Target state

The browser and page should retain the same endpoint and hook boundaries, but
there should be one server-side provider:

```text
Product Owner page
  -> useProductOwnerMainView
  -> productOwnerDashboardService
  -> dashboardEndpointService
  -> dashboard endpoint route
  -> validated Splunk provider
  -> approved saved search / Azure Function
  -> server-side response mapper
  -> Product Owner page payload
```

The page should not need to know whether data originated in Splunk. The
provider must return the same complete contract for successful responses,
including explicit availability states for values that are not available.

---

## 3. Preconditions before deleting mocks

Complete and verify all of these before changing source selection:

### 3.1 Approve the Splunk contract

Confirm:

- the saved-search name or allowlisted routing for metrics;
- the saved-search name or routing for each supported `chartId`;
- the Azure Function request fields;
- the encoding of `businessUnits` and `projects`;
- the time-range format and timezone behavior;
- the raw Splunk result aliases; and
- the expected empty-result and partial-result behavior.

The existing [Splunk report service](../../lib/services/splunkReportService.ts)
is a general service used by existing pipeline functionality. Do not change its
existing callers casually. Add a dashboard-specific request method or extend
the service with a typed method if the approved dashboard contract requires
arguments that `getReport()` cannot carry.

### 3.2 Implement filtered live requests

The live provider must use the request it receives:

- map `last_7_days`, `last_30_days`, and `last_90_days` to the correct Splunk
  time range;
- forward business-unit and project filters;
- forward timezone;
- route the requested metric set and chart ID to the approved source; and
- never build an unrestricted query from arbitrary browser input.

The current fixed 30-day request in
[dashboardSplunkSource.ts](../../lib/server/dashboard/dashboardSplunkSource.ts)
is only a connectivity-stage implementation and is not sufficient for
production.

### 3.3 Implement the response mapper

Add a server-side mapper that converts raw Azure Function/Splunk rows into the
Product Owner endpoint contract:

- `MetricsResponseDto`;
- `TimeseriesResponseDto`;
- `MetricResultDto`;
- `SeriesResultDto`; and
- `SupportingStatDto`.

The mapper must:

- validate required result fields;
- convert numeric strings deliberately;
- preserve explicit availability states;
- return `NO_DATA` or another approved state for empty approved results;
- reject malformed results with an explicit error; and
- avoid silently returning zero or empty successful envelopes.

The current client adapter
[productOwnerEndpointAdapter.ts](../../lib/dashboard/productOwnerEndpointAdapter.ts)
is a pass-through and must not be used as a substitute for a server-side raw
Splunk mapper.

### 3.4 Make the Product Owner page safe for the live contract

Verify that the live response contains every field the page reads, or update
the page and adapter to handle the response contract explicitly. In
particular, do not return `{ meta, metrics: [] }` when the page expects
`productExperiencePulse`; that caused the runtime failure documented in the
[Splunk response failure debt note](./technical-debt-splunk-response-failure.md).

### 3.5 Cover all Product Owner data

The mock endpoint removal is not complete while the page still imports mock
data directly. The following currently remain outside the endpoint pipeline:

- Product Owner drawer JSON files;
- the Channel Mix values declared in
  [page.tsx](../../app/home/product-owner-dashboard/page.tsx);
- legacy main-view code that remains in the repository.

Choose one of these approaches for each drawer:

1. return drawer content from a live endpoint response; or
2. add a lazy, drawer-specific live request that runs when the drawer opens.

Do not replace a drawer fixture with invented hardcoded values.

---

## 4. Recommended implementation sequence

Do this work in small, independently verifiable changes.

### Step 1 — Record the approved contract

Update the endpoint and Splunk contract documentation with the final request
and response fields. Keep the documentation aligned with the executable DTOs
in [dashboardEndpointDtos.ts](../../types/dashboardEndpointDtos.ts).

### Step 2 — Implement and test the live mapper

Create a focused mapper near the server dashboard provider. Keep it pure:
input raw result, output typed endpoint response, no React or browser
dependencies.

Add tests for:

- a valid metrics response;
- a valid timeseries response;
- numeric string conversion;
- empty results;
- unavailable metrics;
- malformed rows;
- unexpected metric IDs; and
- missing required fields.

### Step 3 — Complete the Splunk provider

Update
[dashboardSplunkSource.ts](../../lib/server/dashboard/dashboardSplunkSource.ts)
to:

1. validate or receive a validated request;
2. select an allowlisted saved search;
3. pass the requested filters and time range;
4. call the typed Splunk/Azure Function method;
5. map the raw result;
6. return a complete endpoint response; and
7. log only safe operational metadata.

Remove the deliberate `DashboardSplunkContractError` only after the mapper and
live response tests pass.

### Step 4 — Run mock and Splunk in parallel for comparison

Before deleting the mock branch, compare both providers for equivalent
requests in a controlled environment. Compare:

- response shape;
- metric identifiers;
- availability states;
- filter echoing;
- time-series point count and dates;
- numeric units and precision; and
- error behavior.

The values will not necessarily match historical fixtures, but the contract
and semantics must match. Record and resolve any differences instead of adding
client-side special cases.

### Step 5 — Migrate Product Owner drawers

Move the five drawer payloads from direct JSON imports to live data. Reuse
cached main-view data where it is sufficient; otherwise add explicit lazy
detail requests.

Remove these direct fixture imports from the Product Owner page after the live
drawer path is verified:

- `product-owner-adoption-and-engagement.json`;
- `product-owner-channel-mix.json`;
- `product-owner-experience-quality.json`;
- `product-owner-product-experience-pulse.json`; and
- `product-owner-trust-evidence.json`.

### Step 6 — Remove the mock selector and provider

After all Product Owner consumers use live data:

1. delete `loadMockMetrics` and `loadMockTimeseries`;
2. remove the `mock` branch from
   [dashboardDataSource.ts](../../lib/server/dashboard/dashboardDataSource.ts);
3. make the selector call the live provider directly, or remove the selector
   if it no longer adds value;
4. reject `DASHBOARD_DATA_SOURCE=mock` clearly during the transition, then
   remove the variable once deployment configuration is updated;
5. remove `meta.illustrative` from the live contract if it is mock-only; and
6. delete the Product Owner endpoint fixture only after repository-wide usage
   search confirms it is no longer needed.

Do not silently interpret `mock` as Splunk. A stale deployment setting should
fail clearly so that an environment cannot appear healthy while serving an
unexpected source.

### Step 7 — Remove obsolete compatibility paths

After the page and drawers are live:

- remove the unused Product Owner legacy `main-view` service and route;
- remove the retired
  [_productOwnerDashboardService.ts](../../lib/services/_productOwnerDashboardService.ts)
  once no import remains;
- remove old Product Owner hooks that are no longer referenced;
- remove mock-only comments and migration instructions; and
- update hand-over and endpoint documentation to describe only the live path.

Do not delete shared infrastructure used by the other three dashboards without
first migrating those dashboards. Their existing `main-view` routes and mock
fixtures are separate technical-debt items.

---

## 5. Configuration cleanup

### Local configuration

Remove or update the repository's local `.env` entry:

```env
DASHBOARD_DATA_SOURCE=mock
```

Do not commit secrets while changing environment files. If local developers
still need a provider switch during a staged rollout, use an explicitly
documented temporary value and add an expiry/removal issue.

### Deployed configuration

Search deployment configuration, pipeline variables, and runbooks for
`DASHBOARD_DATA_SOURCE`. After all environments use the live provider:

- remove `DASHBOARD_DATA_SOURCE=mock`;
- remove code that accepts `mock`;
- optionally remove `DASHBOARD_DATA_SOURCE` entirely, since Splunk becomes the
  only provider; and
- verify that `ENVIRONMENT`, Key Vault settings, and Splunk Function settings
  are still configured independently.

`DASHBOARD_DATA_SOURCE` is not the same as `ENVIRONMENT` and should not be
replaced by changing `ENVIRONMENT`.

---

## 6. Files and symbols affected

### Primary Product Owner endpoint pipeline

| Area | Current location | Removal or change |
| --- | --- | --- |
| Source selection | [dashboardDataSource.ts](../../lib/server/dashboard/dashboardDataSource.ts) | Remove `mock` type, parsing branch, and mock loader calls. |
| Mock provider | [productOwnerDemoSource.ts](../../lib/server/dashboard/productOwnerDemoSource.ts) | Delete after parser responsibilities and fixture consumers are moved. |
| Splunk provider | [dashboardSplunkSource.ts](../../lib/server/dashboard/dashboardSplunkSource.ts) | Replace connectivity-stage throw with filtered call and mapper. |
| Endpoint routes | [metrics route](../../app/api/dashboard/metrics/route.ts), [timeseries route](../../app/api/dashboard/timeseries/route.ts) | Preserve routes; update error handling for the final live provider. |
| Request parsing | [dashboardRequestParsers.ts](../../lib/server/dashboard/dashboardRequestParsers.ts) | Move runtime validation out of the demo provider. |
| Main fixture | [product-owner-dashboard.json](../../public/mocks/new-pages/product-owner-dashboard.json) | Delete only after repository-wide usage search. |
| Environment config | `.env`, deployment settings, docs | Remove `DASHBOARD_DATA_SOURCE=mock` and stale dual-source instructions. |

### Product Owner consumers

| Area | Current location | Removal or change |
| --- | --- | --- |
| Page | [product-owner-dashboard/page.tsx](../../app/home/product-owner-dashboard/page.tsx) | Remove direct drawer fixture imports and local Channel Mix values. |
| Hooks | [useProductOwnerDashboardEndpoints.ts](../../hooks/useProductOwnerDashboardEndpoints.ts) | Retain the hook boundary; update only if the final live contract changes. |
| Service | [productOwnerDashboardService.ts](../../lib/services/productOwnerDashboardService.ts) | Retain request construction; remove mock-specific assumptions. |
| Adapter | [productOwnerEndpointAdapter.ts](../../lib/dashboard/productOwnerEndpointAdapter.ts) | Implement only required live DTO-to-page-model mapping, or retain as a typed pass-through if the final contract matches. |
| Drawer fixtures | `public/mocks/new-pages/product-owner-*.json` | Delete after live drawer endpoints are verified and no imports remain. |
| Legacy service | [_productOwnerDashboardService.ts](../../lib/services/_productOwnerDashboardService.ts) | Delete after import search confirms it is unused. |

---

## 7. Verification checklist

### Before removal

- [ ] Splunk request uses the requested time range, filters, and timezone.
- [ ] Saved-search routing is allowlisted.
- [ ] Raw response mapping is implemented and unit tested.
- [ ] Metrics and timeseries responses satisfy the page contract.
- [ ] Empty and unavailable data use explicit states, never fake zeroes.
- [ ] Splunk errors are surfaced without a success-shaped fallback.
- [ ] Product Owner drawers have live data paths.
- [ ] The page no longer relies on direct mock imports.

### During removal

- [ ] Search all references to `DASHBOARD_DATA_SOURCE`.
- [ ] Search all references to `productOwnerDemoSource`.
- [ ] Search all references to `product-owner-dashboard.json`.
- [ ] Search all direct imports from `public/mocks/new-pages` in Product Owner code.
- [ ] Remove the mock branch only after the live provider is the verified path.
- [ ] Keep unrelated dashboard mock paths intact.

### After removal

- [ ] `DASHBOARD_DATA_SOURCE=mock` fails clearly or is removed entirely.
- [ ] No Product Owner route returns fixture data.
- [ ] No Product Owner drawer reads a fixture directly.
- [ ] No obsolete Product Owner main-view service or hook is imported.
- [ ] `meta.illustrative` is absent from live responses unless explicitly part
      of the approved contract.
- [ ] `npx tsc --noEmit` passes.
- [ ] Focused ESLint passes for changed TypeScript files.
- [ ] `git diff --check` passes.
- [ ] Metrics endpoint returns a valid response with live data.
- [ ] Both timeseries endpoints return valid responses with live data.
- [ ] Loading, error, no-data, and unavailable states render correctly.
- [ ] The Product Owner dashboard loads with no mock configuration.

---

## 8. Completion criteria

This technical-debt item is complete when:

1. the Product Owner dashboard has one verified live data provider;
2. the mock source selector and Product Owner mock provider are gone;
3. all Product Owner main-view and drawer data comes through approved live
   contracts;
4. no stale `DASHBOARD_DATA_SOURCE=mock` configuration remains;
5. the Product Owner fixture is deleted or has a documented remaining consumer;
6. the old Product Owner main-view path is deleted; and
7. documentation describes the live architecture without instructing developers
   to enable mocks.

The other dashboards may still have independent mock pipelines. Track their
migrations separately rather than treating this Product Owner cleanup as a
repository-wide deletion of every mock file.

