# Draft PR description: Product Owner Splunk connection

## Summary

This PR wires the Product Owner dashboard's new metrics endpoint to the
Splunk-facing Azure Function and adds raw-response logging to validate the
connection before metric mapping is implemented.

The page currently has two parallel data pipelines:

- **New endpoint pipeline:** `useProductOwnerMainView` loads metrics and
  timeseries data through the shared dashboard endpoints. Splunk is the default
  server-side source.
- **Transitional mock pipeline:** `useDashboardProductOwnerMainView` continues
  to supply mock data for Product Owner sections not covered by the new
  contracts.

The transitional pipeline should be removed after all remaining sections are
migrated to the new Splunk-backed endpoint architecture.

## Metrics data flow

This PR follows the metrics branch:

```text
app/home/product-owner-dashboard/page.tsx
  -> useProductOwnerMainView
  -> useProductOwnerMetrics
  -> productOwnerDashboardEndpointService.getMetrics
  -> dashboardEndpointService.getMetrics
  -> POST /api/dashboard/metrics
  -> loadDashboardMetrics
  -> loadSplunkMetrics
  -> fetchSplunkReport.postSplunkQuery
  -> Azure Function /api/splunk/query
  -> Splunk
```

The page passes the selected period, business unit, and project into
`useProductOwnerMainView`. `getMetrics` converts those filters into the shared
dashboard request DTO and asks for the four Product Experience Pulse metrics.
The shared endpoint service posts that request to the Next.js metrics route.

On the server, `dashboardDataSource.ts` selects the provider:

- unset/empty `DASHBOARD_DATA_SOURCE` or `splunk` -> Splunk path;
- `DASHBOARD_DATA_SOURCE=mock` -> endpoint fixture path.

There is no automatic Splunk-to-mock fallback.

## Azure Function boundary

`splunkReportService.ts` does not connect to Splunk directly. It posts the
saved-search query and time range to:

```text
{SPLUNK_SERVICE_BASE_URL}/api/splunk/query?code={SPLUNK_FUNCTION_SECRET}
```

That endpoint is the function-key-protected Azure Function intermediary. The
Azure Function owns the downstream Splunk call and forwards the response back
to the Next.js server.

For local execution, the Function URL and secret come from environment
variables. In non-local environments, they are loaded from Azure Key Vault.

## Current stage

`loadSplunkMetrics` currently:

- executes `| savedsearch consolidated_metric_final`;
- uses a rolling 30-day interval;
- logs the complete raw Azure Function response in the Next.js server logs;
- returns a valid response envelope with `metrics: []`.

This intentionally proves connectivity before implementing the data contract.
The selected dashboard filters are not yet forwarded to the upstream query,
and no raw Splunk fields are mapped to Product Owner metrics yet.

`adaptProductOwnerMetrics` remains the endpoint-DTO-to-UI-model boundary. Its
meaningful metric mapping will be completed after the raw Azure
Function/Splunk response shape is confirmed and the server can return populated
metric rows.

## Follow-up work

- Confirm the raw Azure Function/Splunk response contract
- Forward dashboard filters to the approved saved search
- Map raw results into `MetricsResponseDto`
- Complete metric adaptation and rendering
- Implement the timeseries integration
- Restore production-grade request validation
- Replace full raw-response logging with scoped operational logging
- Migrate the remaining mock-backed Product Owner sections
- Remove the transitional `useDashboardProductOwnerMainView` pipeline

## Validation focus

- Confirm the metrics request reaches `/api/dashboard/metrics`
- Confirm the server selects `loadSplunkMetrics`
- Confirm the Azure Function request succeeds
- Confirm `[dashboard] Splunk metrics raw response:` appears in server logs
- Inspect the logged payload to define the next-stage mapping contract
