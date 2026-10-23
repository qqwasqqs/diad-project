# Technical debt — Dashboard request validation and response adaptation

## Status

**Open and intentionally deferred.**

Four functions in the dashboard endpoint pipeline exist as named seams but
currently perform no work:

| Function | Declared in | Called from |
| --- | --- | --- |
| `parseDashboardMetricsRequest` | [dashboardRequestParsers.ts](../../lib/server/dashboard/dashboardRequestParsers.ts) | [metrics route](../../app/api/dashboard/metrics/route.ts) |
| `parseDashboardTimeseriesRequest` | [dashboardRequestParsers.ts](../../lib/server/dashboard/dashboardRequestParsers.ts) | [timeseries route](../../app/api/dashboard/timeseries/route.ts) |
| `adaptProductOwnerMetrics` | [productOwnerEndpointAdapter.ts](../../lib/dashboard/productOwnerEndpointAdapter.ts) | [productOwnerDashboardService.ts](../../lib/services/productOwnerDashboardService.ts) |
| `adaptProductOwnerTimeseries` | [productOwnerEndpointAdapter.ts](../../lib/dashboard/productOwnerEndpointAdapter.ts) | [productOwnerDashboardService.ts](../../lib/services/productOwnerDashboardService.ts) |

They are grouped in one document because they are two ends of the same
contract boundary:

```text
browser request
  -> parseDashboard*Request        (server-side request validation)
  -> Splunk request
  -> raw Splunk response
  -> server-side mapper            (missing; see the mock-source debt note)
  -> adaptProductOwner*            (client-side response adaptation)
  -> Product Owner page
```

Both ends can only be finished once the Splunk request and response contracts
are approved. Implementing them against guessed contracts would produce
validation rules and transformations that have to be rewritten.

Related documents:

- [Product Owner dashboard data connection](./product-owner-dashboard-data-connection.md)
- [Technical debt — Remove the dashboard mock data source](./technical-debt-remove-dashboard-mock-source.md)
- [Splunk response failure technical debt](./technical-debt-splunk-response-failure.md)

---

## 1. Request validation

### 1.1 Current behavior

[dashboardRequestParsers.ts](../../lib/server/dashboard/dashboardRequestParsers.ts)
delegates to `parseMetricsRequest` and `parseTimeseriesRequest` in
[productOwnerDemoSource.ts](../../lib/server/dashboard/productOwnerDemoSource.ts).
Both of those functions currently do only this:

```ts
export function parseMetricsRequest(value: unknown): MetricsRequestDto {
  return value as MetricsRequestDto;
}
```

The consequences are:

- the request body is **not** validated at runtime;
- `unknown` input is asserted into a DTO type, so TypeScript stops warning
  about a shape that was never checked;
- the `400` branch in both routes is effectively unreachable, because the
  parser cannot throw; and
- any malformed field reaches the data provider unchecked.

### 1.2 Why it is in this state

The original validation was written for the local fixture demo. It is still
present in the file, commented out, and it required:

- exactly one business unit from the set `all`, `a`, `b`;
- exactly one project from the set `a1`, `b1`, `all`;
- `dashboard === "product-owner"`;
- exactly the section `product-experience-pulse`; and
- metric and chart IDs from hardcoded demo lists.

Because both routes used that validation in every environment, real `dev` and
`prod` filters were rejected with HTTP 400 before a Splunk request could be
attempted. The validation was disabled so that the Splunk connectivity work
could proceed.

The disabled block is marked `TECH DEBT — request validation is temporarily
disabled` in `productOwnerDemoSource.ts`.

### 1.3 Two separate problems

Do not fix this by simply uncommenting the old code. There are two distinct
defects:

1. **No runtime validation exists today.** The routes accept any JSON body.
2. **The old validation lived in the wrong module.** Request validation is a
   route-level concern; it must not be owned by the mock provider, which is
   itself scheduled for deletion. See
   [technical-debt-remove-dashboard-mock-source.md](./technical-debt-remove-dashboard-mock-source.md).

### 1.4 Required implementation

Move validation into `dashboardRequestParsers.ts` so the routes do not depend
on a provider, then implement it so that it:

- confirms the body is an object;
- validates the `dashboard` discriminator;
- validates `sections`, `metrics`, `chartId`, and `granularity` against the
  approved identifiers in
  [dashboardEndpointDtos.ts](../../types/dashboardEndpointDtos.ts);
- validates `filters.timeRange.type` and `filters.timeRange.value`;
- validates `filters.timezone`;
- validates that `businessUnits` and `projects` are string arrays, using
  approved values rather than demo-only allowlists;
- rejects unknown or duplicated metric identifiers;
- returns a normalized DTO rather than the raw input; and
- throws a descriptive error that the routes already translate into HTTP 400.

Design constraints:

- Allowlists must come from the approved filter source, not from literals
  copied out of the demo provider. The filter options already served by
  `/api/dashboard/filters` are the natural reference point.
- Validation must not assume one business unit and one project. The DTO
  declares arrays, and the filter contract may allow multi-select later.
- Validation must behave identically for the mock and Splunk providers. A
  request that is valid in local development must not be rejected in a
  deployed environment, and the reverse.
- Validation must not silently coerce. An unsupported period is an error, not
  a fallback to `last_30_days`.

### 1.5 Security note

This is the only server-side boundary between the browser and the Splunk
query path. `postSplunkQuery` in
[splunkReportService.ts](../../lib/services/splunkReportService.ts) accepts a
`SEARCH_QUERY` string. Today that string is a server-side constant, which is
why unvalidated input has not become an injection path.

If the live provider ever builds any part of the search from request values,
validation becomes a security control rather than a correctness check. In that
case, bind values to an allowlisted saved search and approved parameters.
Never concatenate request values into a search string.

---

## 2. Response adaptation

### 2.1 Current behavior

[productOwnerEndpointAdapter.ts](../../lib/dashboard/productOwnerEndpointAdapter.ts)
contains two pure pass-throughs:

```ts
export function adaptProductOwnerMetrics(
  response: ProductOwnerDashboardMetricsPayload,
): ProductOwnerDashboardMetricsPayload {
  return response;
}
```

They are called by
[productOwnerDashboardService.ts](../../lib/services/productOwnerDashboardService.ts)
after each endpoint request, so every response reaches the page unchanged.

### 2.2 Why it is in this state

An earlier implementation converted endpoint DTOs into a separate view model,
including unit conversion from milliseconds to seconds. That was removed
during the endpoint migration, which established the rule that the page reads
the raw payload shape and that payload types mirror the fixture exactly.

The adapters were kept as a named seam so that a future Splunk-shaped response
has an obvious place to be normalized.

### 2.3 This may legitimately stay a pass-through

**Do not add transformations merely to make these functions non-empty.**

The correct outcome depends on an explicit decision about the final response
contract:

| Decision | Correct outcome for the adapters |
| --- | --- |
| The live endpoint returns exactly the page payload shape | Keep them as typed pass-throughs, or delete them and call the transport directly. |
| The live endpoint returns the generic DTO shape (`MetricsResponseDto`) | Implement real DTO-to-page-model mapping here, or map on the server. |

A transformation that exists in two places, or a mapping split between the
server mapper and the client adapter, is worse than either option chosen
deliberately.

### 2.4 The contract mismatch these functions currently hide

There is a real, unresolved shape conflict today:

- `loadMockMetrics` returns `ProductOwnerDashboardMetricsPayload` — the page
  shape, with `productExperiencePulse`, `feedbackSummary`, and so on.
- `loadSplunkMetrics` is typed as returning `MetricsResponseDto` — the generic
  wire shape, with `meta` and a flat `metrics` array.
- `productOwnerDashboardService.getMetrics` declares the response as
  `ProductOwnerDashboardMetricsPayload`.
- `adaptProductOwnerMetrics` asserts nothing and changes nothing.

Because the adapter is a pass-through, nothing in the chain detects the
mismatch. This already caused a production-shaped failure: when the Splunk
loader returned `{ meta, metrics: [] }`, the page crashed on
`metrics.data.productExperiencePulse.sessionQueryVolume`, since `metrics.data`
was defined but `productExperiencePulse` was not. That incident is recorded in
[Splunk response failure technical debt](./technical-debt-splunk-response-failure.md).

Whoever resolves this must pick **one** contract and make every provider honor
it. Resolving it with a type cast, or by restoring an empty envelope,
reintroduces the same crash.

### 2.5 Required implementation, if mapping is needed

If the live contract is the generic DTO shape, the adapters must:

- validate that required fields are present before the page reads them;
- reject non-finite numbers rather than rendering `NaN`;
- preserve availability states and their `reason` text;
- map metric identifiers to the fields the page reads;
- apply any approved unit conversion in exactly one place; and
- remain pure, with no HTTP calls and no React dependencies.

They must not:

- invent values for missing metrics;
- substitute `0`, `-`, or an empty string for unavailable data;
- apply presentation concerns such as labels, colors, icons, or number
  formatting, which belong in the page; or
- silently drop metrics the page does not yet render without surfacing them as
  an explicit state.

---

## 3. Dependencies and sequencing

Neither end can be completed in isolation. The order is:

1. **Approve the request contract.** Saved-search routing, filter arguments,
   array encoding, and allowlisted filter values. Request validation cannot be
   written correctly before this; see
   [the mock-source removal note](./technical-debt-remove-dashboard-mock-source.md),
   section 3.1.
2. **Implement request validation** in `dashboardRequestParsers.ts`, decoupled
   from the mock provider. This can be done as soon as the approved filter
   values are known, and it does not require live data.
3. **Approve the response contract.** Raw Splunk aliases, result fields, and
   the shape the endpoints return.
4. **Implement the server-side mapper** from raw Splunk rows to the approved
   endpoint response.
5. **Decide the adapter's fate** using the table in section 2.3, then either
   implement the mapping or document the pass-through as deliberate.

Step 2 is the one piece of this document that is **not** blocked by the Splunk
response contract. It can be delivered independently, and doing so removes the
current "any JSON is accepted" behavior ahead of the rest of the work.

---

## 4. Testing requirements

### Request validation

Add tests covering:

- a valid metrics request and a valid timeseries request;
- a non-object body, `null`, and an array;
- a missing or wrong `dashboard` discriminator;
- each unsupported `timeRange.value`;
- an unsupported `timezone`;
- `businessUnits` or `projects` that are absent, not arrays, or contain
  non-strings;
- unknown and duplicated metric identifiers;
- an unknown `chartId`;
- an unsupported `granularity`; and
- confirmation that the routes return HTTP 400 with a descriptive message for
  each rejection.

### Response adaptation

If mapping is implemented, add tests covering:

- a complete valid response;
- each availability state, with its `reason` preserved;
- missing required fields;
- non-finite and string-typed numeric values;
- an empty series and an empty supporting-stat list;
- unknown metric identifiers; and
- any approved unit conversion, asserted on the value and the unit.

If the adapters remain pass-throughs, a type-level test or an explicit comment
recording the decision is sufficient; a runtime test that asserts
`adapt(x) === x` adds no value.

---

## 5. Completion criteria

This technical-debt item is complete when:

1. `parseDashboardMetricsRequest` and `parseDashboardTimeseriesRequest`
   perform real runtime validation and return normalized DTOs;
2. that validation lives in `dashboardRequestParsers.ts` and does not import
   from the mock provider;
3. the disabled validation block and its `TECH DEBT` comment are removed from
   [productOwnerDemoSource.ts](../../lib/server/dashboard/productOwnerDemoSource.ts),
   or that file is deleted with the mock source;
4. invalid requests are rejected with HTTP 400 in every environment, using the
   same rules;
5. one response contract is agreed, and every provider returns it;
6. `adaptProductOwnerMetrics` and `adaptProductOwnerTimeseries` either
   implement the agreed mapping or are documented as deliberate pass-throughs,
   with the shape mismatch described in section 2.4 resolved;
7. tests cover the cases in section 4; and
8. this document is deleted, and any remaining follow-up is tracked in the
   relevant hand-over file.
