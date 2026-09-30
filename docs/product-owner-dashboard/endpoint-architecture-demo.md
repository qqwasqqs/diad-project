# Product Owner endpoint architecture demo

Open `/home/product-owner-dashboard/architecture-demo` with
`ENVIRONMENT=local` and `NEXT_PUBLIC_LOCAL_DESIGN_MODE=true` to inspect the
working mock-backed flow. The existing Product Owner page keeps its current
main-view route while this demo is reviewed.

## Data path

1. `hooks/useProductOwnerDashboardEndpoints.ts` runs one metrics query and one
   query for each chart family. They have independent cache keys, loading, and
   error states. One metrics request carries several metric IDs; it is not a
   request per card.
2. `lib/services/productOwnerDashboardEndpointService.ts` converts the filter
   bar selection to the planned POST request DTOs and calls the two endpoints.
3. `app/api/dashboard/metrics/route.ts` and
   `app/api/dashboard/timeseries/route.ts` use local fixture data through
   `lib/server/dashboard/productOwnerDemoSource.ts` in local design mode. This
   server-side provider is the Splunk integration point. Non-local requests
   return HTTP 501 until a real provider is configured.
4. `types/dashboardEndpointDtos.ts` describes the wire request and response
   objects. `lib/dashboard/productOwnerEndpointAdapter.ts` validates the fields
   this demo uses, preserves pending states, converts latency milliseconds to
   seconds, and returns the models in
   `types/productOwnerDashboardModels.ts`.
5. The demo page displays the three resulting models independently. It does
   not combine cards, charts, and drawers into one server payload.

The Splunk provider must supply approved aggregates, daily buckets, effective
filters, and per-metric statuses. The local fixture scales selected scopes only
to make the demo interactive; those values are illustrative. Workflow
Completion stays `DATA_PENDING`, and API Error Rate stays
`CALCULATION_PENDING` because their live rules remain unapproved. The fixture's
Intent Resolution series also stays `CALCULATION_PENDING` until its scale and
direction are confirmed. The fixture's chart labels are preserved as supplied;
a live provider must return dates in
the endpoint contract's agreed format.

The MVP covers four metrics and two chart families. Drawer data and the other
Product Owner metrics remain on the existing route until their contracts and
source mappings are ready. No Splunk credentials or live calls are used.
