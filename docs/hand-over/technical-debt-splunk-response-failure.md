# Technical debt: Splunk loaders fail instead of returning empty envelopes

## Status

**Active.** This is a temporary measure. Revert it once the Splunk response
contract is confirmed and mapping is implemented.

Affected file:

- [`lib/server/dashboard/dashboardSplunkSource.ts`](../../lib/server/dashboard/dashboardSplunkSource.ts)

Affected functions:

- `loadSplunkMetrics`
- `loadSplunkTimeseries`

## Why this exists

With `DASHBOARD_DATA_SOURCE=splunk`, both loaders previously returned a valid
but **empty** response envelope (`metrics: []`, `series: []`). That was a
deliberate stage-one connectivity test.

On the dev machine, where the Azure Function is actually reachable, this caused
a runtime crash in the Product Owner page:

```
Runtime TypeError
Cannot read properties of undefined (reading 'sessionQueryVolume')
app/home/product-owner-dashboard/page.tsx (270:19) @ ProductOwnerDashboard
```

### Root cause

The page reads the **page model** shape, not the endpoint DTO shape:

```ts
const sessionMetric = metrics.data?.productExperiencePulse.sessionQueryVolume;
```

Optional chaining guards `metrics.data` only. When the Splunk loader returned
`{ meta, metrics: [] }`, `metrics.data` was defined but
`metrics.data.productExperiencePulse` was `undefined`, so reading
`.sessionQueryVolume` threw.

The shape mismatch is hidden by two places that assume the mock payload type:

- [`productOwnerDashboardService.getMetrics`](../../lib/services/productOwnerDashboardService.ts)
  declares the response as `ProductOwnerDashboardMetricsPayload`.
- [`adaptProductOwnerMetrics`](../../lib/dashboard/productOwnerEndpointAdapter.ts)
  is a pass-through and performs no DTO-to-page-model mapping.

This did not reproduce on machines where the Splunk call fails, because a
failed request leaves `metrics.data` undefined and the page renders its
existing `REQUEST FAILED` state.

## What the temporary change does

Both loaders still:

1. perform the Splunk call, and
2. log the raw response for inspection.

They then throw `DashboardSplunkContractError` instead of returning an empty
envelope. The API routes map that error to HTTP `501`, Axios rejects, React
Query sets `isError`, and the page renders **REQUEST FAILED** everywhere.

This keeps the connectivity test and raw-response logging intact while removing
the crash and avoiding misleading "DATA PENDING" states.

A side effect of throwing is that `request` is no longer read in either
function, so each body starts with `void request;` to satisfy the unused
parameter lint rule. Remove those lines when restoring the returns below.

The `DashboardSplunkContractError` message was also reworded from
"Cannot call Splunk for dashboard ..." to "Cannot use the Splunk response for
dashboard ...", because the call now succeeds and only the response is
unusable.

## How to revert

1. Implement the real mapping from the raw Splunk/Azure Function response to
   `MetricsResponseDto` and `TimeseriesResponseDto`, **or** map it to the page
   model inside
   [`productOwnerEndpointAdapter.ts`](../../lib/dashboard/productOwnerEndpointAdapter.ts).
   Do not restore the empty envelopes without mapping; that reintroduces the
   crash.
2. Remove `void request;` from both functions.
3. Replace each `throw new DashboardSplunkContractError(...)` with the original
   return statement recorded below.
4. Restore the original comment above `loadSplunkMetrics`:

   ```ts
   // Stage 1 connectivity test: logs the raw response and returns no metrics; filters and mapping come in stage 2.
   ```

5. Replace full raw-response logging with scoped operational logging.
6. Delete this document.

## Removed code

### `loadSplunkMetrics`

Replaced `throw new DashboardSplunkContractError("metrics");` with:

```ts
  return {
    meta: {
      dashboard: "product-owner",
      requestId: crypto.randomUUID(),
      generatedAt: end.toISOString(),
      appliedFilters: {
        timeRange: request.filters.timeRange.value,
        businessUnits: [...request.filters.businessUnits],
        projects: [...request.filters.projects],
        timezone: request.filters.timezone,
      },
    },
    metrics: [],
  };
```

### `loadSplunkTimeseries`

Replaced `throw new DashboardSplunkContractError("timeseries");` with:

```ts
  return {
    meta: {
      dashboard: "product-owner",
      requestId: crypto.randomUUID(),
      generatedAt: end.toISOString(),
      appliedFilters: {
        timeRange: request.filters.timeRange.value,
        businessUnits: [...request.filters.businessUnits],
        projects: [...request.filters.projects],
        timezone: request.filters.timezone,
      },
      chartId: request.chartId,
      granularity: request.granularity,
    },
    series: [],
    supportingStats: [],
  };
```

Both snippets depend on the surrounding `end` constant and the `request`
parameter, which are already present in each function.

## Follow-up work this blocks

- Confirm the raw Azure Function/Splunk response contract.
- Forward dashboard filters to the approved saved search.
- Map raw results into `MetricsResponseDto` and `TimeseriesResponseDto`.
- Complete metric adaptation and rendering.
- Guard the page reads (`productExperiencePulse?.sessionQueryVolume`) or make
  the adapter the enforced DTO-to-page-model boundary.
