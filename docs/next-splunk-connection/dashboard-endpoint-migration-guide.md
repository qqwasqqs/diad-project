# Dashboard endpoint migration guide

## Purpose

This document describes how to migrate a dashboard page onto the shared
dashboard endpoint pipeline, in the same way the Product Owner dashboard was
migrated.

Use it as the implementation reference for the Executive, Tech Team, Operations
Team, and any other dashboard that still calls a per-dashboard `main-view`
route.

The Product Owner dashboard is the reference implementation. When this guide is
ambiguous, read the Product Owner files listed in
[Reference implementation](#reference-implementation) and copy their structure.

This guide covers the **mock data pipeline only**. The Splunk pipeline is a
separate, later stage. Do not start it as part of this migration.

## Scope

In scope:

- One hook that fetches all data for the dashboard main view.
- Raw endpoint payloads consumed directly by the page.
- A mock server source that returns fixture data with no filtering and no
  recalculation.
- Retirement of the legacy per-dashboard service and the legacy main-view hook.

Out of scope:

- Splunk requests, saved searches, and field mappings.
- Drawer migrations. Drawers stay on their existing mock files.
- DTO-based view models. See [The DTO rule](#the-dto-rule).
- Front-end layout work. Any visual fix is a separate commit with its own
  reason.

## Target architecture

The flow after migration is:

```
app/home/<dashboard>/page.tsx
  -> hooks/use<Dashboard>DashboardEndpoints.ts   (use<Dashboard>MainView)
    -> lib/services/<dashboard>DashboardService.ts   (request building)
      -> lib/services/dashboardEndpointService.ts    (shared HTTP transport)
        -> app/api/dashboard/metrics/route.ts
           app/api/dashboard/timeseries/route.ts
          -> lib/server/dashboard/dashboardRequestParsers.ts
          -> lib/server/dashboard/dashboardDataSource.ts   (source selection)
            -> lib/server/dashboard/<dashboard>DemoSource.ts
              -> public/mocks/new-pages/<dashboard>.json
```

Key properties of this architecture:

1. The page is a presentation component. It performs no fetching.
2. One hook composes every request the main view needs and returns them as named
   React Query results.
3. Requests stay independent. There is no combined dashboard payload and no
   waterfall.
4. The browser transport is shared by all dashboards. Only request construction
   is per dashboard.
5. The route picks the data source. The client never knows whether the data came
   from a fixture or from Splunk.
6. The mock source reads a fixture and returns it. It does not filter, scale, or
   recalculate.

## The DTO rule

This rule caused the most confusion during the Product Owner migration, so read
it before writing code.

- DTOs in `types/dashboardEndpointDtos.ts` describe the **wire contract**. They
  stay in use for building requests and for server-side request parsing.
- DTOs are **not** the view model. The page must not be written against
  `MetricsResponseDto`, and the client adapter must not convert payloads into a
  separate model type.
- The payload shape the page renders is declared in
  `types/<dashboard>Dashboard.ts` and matches the mock JSON exactly.

In short: keep DTOs at the transport boundary, and let the page read the raw
payload.

## Before you start

Confirm these prerequisites:

1. Your dashboard has a mock JSON file in `public/mocks/new-pages/`. If it does
   not, create one that reflects the shape the page needs.
2. `.env` contains `DASHBOARD_DATA_SOURCE=mock`. Without it the routes default
   to Splunk and your local dashboard will fail.
3. You can run `npx tsc --noEmit` and `npx eslint <file>` successfully on a
   clean checkout.

## Commit plan

Work in small, logical commits. Each commit below is self-contained and
reviewable on its own. Do not merge them into one large change.

| Commit | Goal | Build must pass? |
| --- | --- | --- |
| 1 | Rename the service boundary | No |
| 2 | Return raw mock metrics and make the adapter a pass-through | Yes |
| 3 | Retire the legacy main-view hook | Yes |
| 4 | Consume raw timeseries payloads in the page | Yes |
| 5 | Simplify the mock timeseries source | Yes |

Commit 1 is allowed to leave the build broken. It is a pure rename that
deliberately removes the legacy service before its consumers are migrated.
Commits 2 to 5 must each leave the application type-correct and runnable.

---

## Commit 1 — Rename the service boundary

**Goal:** make the endpoint service the single service for the dashboard, and
park the legacy service for later deletion.

Steps:

1. Rename the legacy service to an underscore-prefixed file:

   ```
   lib/services/<dashboard>DashboardService.ts
     -> lib/services/_<dashboard>DashboardService.ts
   ```

   The underscore marks it as retired-but-not-yet-deleted. Do not delete it in
   this commit. Deleting it early makes manual file synchronisation between
   machines much harder to reverse.

2. Rename the endpoint service into the name just freed:

   ```
   lib/services/<dashboard>DashboardEndpointService.ts
     -> lib/services/<dashboard>DashboardService.ts
   ```

3. Update the exported service object name and every import of it in
   `hooks/use<Dashboard>DashboardEndpoints.ts`.

Do **not** fix the legacy hook in this commit. It still imports the old path and
will fail to type-check. That is expected and intentional.

Validation: none. The build is known to fail.

Suggested message:

```
refactor: rename <Dashboard> dashboard services
```

---

## Commit 2 — Raw mock metrics and a pass-through adapter

**Goal:** stop transforming data between the fixture and the page.

### 2.1 Declare the payload type

In `types/<dashboard>Dashboard.ts`, declare the payload the page renders. It must
mirror the mock JSON structure exactly. For Product Owner this is
`ProductOwnerDashboardMetricsPayload`, which mirrors
`public/mocks/new-pages/product-owner-dashboard.json`.

### 2.2 Return the fixture unchanged

In `lib/server/dashboard/<dashboard>DemoSource.ts`, the metrics loader reads the
fixture and returns it:

```ts
export async function loadMockMetrics(
  request: MetricsRequestDto,
): Promise<<Dashboard>DashboardMetricsPayload> {
  void request;
  return readMock<<Dashboard>DashboardMetricsPayload>("<dashboard>.json");
}
```

Remove any filter mapping, scope factor, period scaling, or per-metric
selection. Mock data does not need filtering. The fixture is the answer.

Keep the `request` parameter so the signature matches the Splunk loader. `void
request;` documents that it is intentionally unused.

### 2.3 Make the client adapter a pass-through

In `lib/dashboard/<dashboard>EndpointAdapter.ts`:

```ts
export function adapt<Dashboard>Metrics(
  response: <Dashboard>DashboardMetricsPayload,
): <Dashboard>DashboardMetricsPayload {
  return response;
}
```

The adapter is kept as a named seam so a future Splunk-shaped response has an
obvious place to be normalised. It must contain no logic today.

### 2.4 Type the transport generically

`lib/services/dashboardEndpointService.ts` is shared. It takes the response type
as a generic parameter so each dashboard gets its own payload type without the
transport knowing anything about it:

```ts
async getMetrics<Response = MetricsResponseDto>(
  request: MetricsRequestDto,
): Promise<Response> {
  const { data } = await apiClient.post<Response>("/api/dashboard/metrics", request);
  return data;
}
```

Call it from the dashboard service with your payload type:

```ts
const response =
  await dashboardEndpointService.getMetrics<<Dashboard>DashboardMetricsPayload>(request);

return adapt<Dashboard>Metrics(response);
```

### 2.5 Leave request parsing as a pass-through

`lib/server/dashboard/dashboardRequestParsers.ts` currently forwards to the demo
source parsers, which return the input cast to the request DTO. That is correct
for this stage: the demo validation was written for the local fixture scope and
rejects real filters.

Do not re-enable that validation. It is commented out and documented as tech
debt, and it belongs in a shared parser module with environment-appropriate
allowlists.

### 2.6 Rewire the metric cards

Update the page's metric cards to read the raw payload, and render the three
request states explicitly:

```tsx
metrics.isPending ? <MetricStateValue>LOADING…</MetricStateValue>
: metrics.isError ? <MetricStateValue>REQUEST FAILED</MetricStateValue>
: sessionMetric ? ( /* value */ )
: <MetricStateValue>DATA PENDING</MetricStateValue>
```

Never render missing or unapproved data as `0`. Pending data is a state, not a
number. Use the explicit availability state instead.

To keep the application type-correct while the legacy hook still exists, point
it temporarily at `lib/services/_<dashboard>DashboardService.ts`.

Validation:

```bash
npx tsc --noEmit
npx eslint app/home/<dashboard>/page.tsx
```

Suggested message:

```
refactor: use raw mock metrics for <dashboard> cards
```

---

## Commit 3 — Retire the legacy main-view hook

**Goal:** remove the second data path so the page has one source.

Steps:

1. Remove every remaining legacy `mainView` read from the page and replace it
   with `metrics.data`.
2. Delete `hooks/use<Dashboard>Dashboard.ts`.
3. Remove the now-unused imports and update any comment that still describes the
   legacy hook as the data source.

After this commit the page gets all of its main-view data from
`use<Dashboard>MainView`.

Validation:

```bash
npx tsc --noEmit
npx eslint app/home/<dashboard>/page.tsx
```

Suggested message:

```
refactor: retire legacy <Dashboard> main view hook
```

---

## Commit 4 — Consume raw timeseries payloads

**Goal:** render charts from the endpoint response shape instead of an adapted
model.

The raw timeseries payload uses `metricId` and a `status` discriminator:

```ts
series: [{ metricId, status: "OK", points: [{ x, y }] }]
supportingStats: [{ metricId, status: "OK", value }]
```

### 4.1 Keep presentation in the page

Chart colours, labels, and axis assignment are presentation, not data. Keep them
in a lookup keyed by `metricId`:

```ts
const seriesPresentation: Record<
  string,
  Pick<DashboardLineSeries, "label" | "color" | "yAxis">
> = {
  sessions: { label: "Sessions", color: "#3b82f6", yAxis: "left" },
  queries: { label: "Queries", color: "#8b5cf6", yAxis: "right" },
};
```

### 4.2 Map only the usable series

```ts
return chart.series.flatMap((item) => {
  const presentation = seriesPresentation[item.metricId];

  return item.status === "OK" && presentation
    ? [{ id: item.metricId, ...presentation, points: item.points }]
    : [];
});
```

### 4.3 Surface what is not available

Anything that is not `OK` is reported below the chart rather than silently
dropped:

```tsx
const unavailable = [...chart.series, ...chart.supportingStats].filter(
  (item) => item.status !== "OK",
);
```

Render each one as `label: STATUS — reason`. This is how the dashboard stays
honest about metrics that are not yet approved.

### 4.4 Handle the request states per chart

Each chart renders `isPending`, `isError`, `data`, and a no-data fallback
independently. One failing chart must not blank the whole page.

Validation:

```bash
npx tsc --noEmit
npx eslint app/home/<dashboard>/page.tsx
```

Suggested message:

```
refactor: consume raw <Dashboard> timeseries data
```

---

## Commit 5 — Simplify the mock timeseries source

**Goal:** make the timeseries loader as simple as the metrics loader.

The original implementation applied a scope factor, a period-based slice, and a
bounded shift to simulate filtered data. Remove all of it.

Remove:

- `scopeFactor`, `periodDays`, `shiftBounded` and the `@/lib/dashboard/mockSource`
  import
- the `toMockFilters` helper
- the `request.metrics` filter
- all rounding and rescaling of points and supporting stats

Keep:

- the response envelope produced by `meta(request.filters)`
- the mapping from fixture entries to `{ metricId, status, ... }`
- the availability states

Derive availability from the fixture content rather than from hardcoded metric
ids:

```ts
const series = source.series.map((item) =>
  item.points.length === 0
    ? {
        metricId: item.id,
        status: "CALCULATION_PENDING" as const,
        points: [] as [],
        reason: "Score scale and direction are not approved",
      }
    : {
        metricId: item.id,
        status: "OK" as const,
        points: item.points.map((point) => ({ x: point.x, y: point.y })),
      },
);
```

```ts
const supportingStats: SupportingStatDto[] = source.supporting.map((item) =>
  item.amount === undefined || item.pendingState
    ? {
        metricId: item.id,
        status: "DATA_PENDING",
        value: null,
        reason: item.pendingState ?? "No approved value",
      }
    : { metricId: item.id, status: "OK", value: item.amount },
);
```

Rationale: the mock pipeline is a development fixture that will be removed once
Splunk is connected. It does not need to simulate filtering, and simulated
filtering hides the real behaviour of the eventual backend. If a filtered view
is needed for review, change the fixture.

Suggested message:

```
refactor: simplify mock timeseries to raw fixture data
```

---

## Shared files you will have to extend

The shared endpoint layer is currently written for `"product-owner"` only.
The first team to migrate a second dashboard must widen it. Coordinate this
change, because it touches every dashboard.

| File | Change needed |
| --- | --- |
| `types/dashboardEndpointDtos.ts` | Widen `dashboard: "product-owner"` to a union of dashboard ids in `MetricsRequestDto`, `TimeseriesRequestDto`, and `DashboardEndpointMetaDto`. Add per-dashboard metric and chart id unions. |
| `lib/server/dashboard/dashboardDataSource.ts` | Select the demo source by `request.dashboard` instead of calling the Product Owner source directly. |
| `lib/server/dashboard/dashboardRequestParsers.ts` | Stop importing parsers from `productOwnerDemoSource`. Move the pass-through parsers into this module so it does not depend on one dashboard's provider. |
| `lib/server/dashboard/<dashboard>DemoSource.ts` | New file per dashboard, modelled on `productOwnerDemoSource.ts`. |

Widening the union is a type-only change for existing dashboards and should be
its own commit, made before the dependent dashboard migration starts.

## Validation

Run these after every commit from Commit 2 onward.

```bash
npx tsc --noEmit
npx eslint app/home/<dashboard>/page.tsx lib/server/dashboard/<dashboard>DemoSource.ts
```

Then verify behaviour against the running dev server:

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/home/<dashboard>
```

```bash
curl -s -X POST http://localhost:3000/api/dashboard/timeseries \
  -H 'Content-Type: application/json' \
  -d '{"dashboard":"<dashboard>","chartId":"<chart-id>","metrics":["<metric>"],
       "filters":{"timeRange":{"type":"relative","value":"last_30_days"},
       "businessUnits":["all"],"projects":["all"],"timezone":"UTC"},
       "granularity":"day","options":{"includeSupportingStats":true}}'
```

Check that series values match the fixture exactly. If they do not, some
transformation is still in the path.

### Note on `npm run build`

A full production build currently fails during page-data collection because
`KEY_VAULT_URL` is not set locally. This is an environment requirement of
unrelated API routes, not a defect in this migration. Use `tsc --noEmit`,
`eslint`, and the dev server for local validation.

## Checklist

Per dashboard:

- [ ] Mock fixture exists in `public/mocks/new-pages/`
- [ ] Payload type declared in `types/<dashboard>Dashboard.ts`, mirroring the fixture
- [ ] Legacy service renamed to `_<dashboard>DashboardService.ts`
- [ ] Endpoint service renamed to `<dashboard>DashboardService.ts`
- [ ] `use<Dashboard>MainView` returns every main-view request
- [ ] Client adapter is a pass-through
- [ ] `loadMockMetrics` returns the fixture unchanged
- [ ] `loadMockTimeseries` applies no filtering, slicing, or scaling
- [ ] Page reads `metrics.data` and the raw timeseries payloads
- [ ] Every chart and card renders pending, error, data, and no-data states
- [ ] Unavailable metrics show a status and a reason, never `0`
- [ ] Legacy main-view hook deleted
- [ ] `tsc --noEmit` and `eslint` pass
- [ ] Dashboard route returns 200 with `DASHBOARD_DATA_SOURCE=mock`

## Pitfalls

1. **Do not combine the commits.** These changes are transferred between
   machines by hand. A single large commit is very hard to reconcile if part of
   it is wrong.
2. **Do not delete the legacy service in Commit 1.** Prefix it. Delete it only
   once every consumer is migrated and the dashboard is verified.
3. **Do not reintroduce filtering into the mock source.** If a reviewer wants
   different numbers, change the fixture.
4. **Do not build the page against DTOs.** See [The DTO rule](#the-dto-rule).
5. **Do not render pending metrics as zero.** Use the availability state and its
   reason.
6. **Do not re-enable the commented-out demo validation.** It rejects real
   filters and will break non-local environments.
7. **Do not start Splunk work in this migration.** It is a separate stage with
   its own contract questions.

## Reference implementation

| Layer | File |
| --- | --- |
| Page | [app/home/product-owner-dashboard/page.tsx](../../app/home/product-owner-dashboard/page.tsx) |
| Hook | [hooks/useProductOwnerDashboardEndpoints.ts](../../hooks/useProductOwnerDashboardEndpoints.ts) |
| Dashboard service | [lib/services/productOwnerDashboardService.ts](../../lib/services/productOwnerDashboardService.ts) |
| Shared transport | [lib/services/dashboardEndpointService.ts](../../lib/services/dashboardEndpointService.ts) |
| Client adapter | [lib/dashboard/productOwnerEndpointAdapter.ts](../../lib/dashboard/productOwnerEndpointAdapter.ts) |
| Metrics route | [app/api/dashboard/metrics/route.ts](../../app/api/dashboard/metrics/route.ts) |
| Timeseries route | [app/api/dashboard/timeseries/route.ts](../../app/api/dashboard/timeseries/route.ts) |
| Request parsers | [lib/server/dashboard/dashboardRequestParsers.ts](../../lib/server/dashboard/dashboardRequestParsers.ts) |
| Source selection | [lib/server/dashboard/dashboardDataSource.ts](../../lib/server/dashboard/dashboardDataSource.ts) |
| Mock source | [lib/server/dashboard/productOwnerDemoSource.ts](../../lib/server/dashboard/productOwnerDemoSource.ts) |
| Wire contracts | [types/dashboardEndpointDtos.ts](../../types/dashboardEndpointDtos.ts) |
| Payload types | [types/productOwnerDashboard.ts](../../types/productOwnerDashboard.ts) |
| Fixture | [public/mocks/new-pages/product-owner-dashboard.json](../../public/mocks/new-pages/product-owner-dashboard.json) |

Related reading:

- [Implemented dashboard data architecture](./dashboard-data-architecture-implemented.md)
- [Initial dashboard data architecture proposal](./dashboard-data-architecture.md)
