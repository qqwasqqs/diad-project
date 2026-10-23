# Email content

**Subject:** Dashboard hand-over documentation and suggested next steps

Hi everyone,

As part of the hand-over for the four dashboards we created, I have attached
the relevant documentation covering their structure, the current Product Owner
dashboard integration with Splunk, and the identified technical debt.

## Current Product Owner dashboard connection status

The code path connecting the Product Owner dashboard to the Splunk report
service is implemented and working. The dashboard currently supports two data
sources:

- **Mock data**, used for local development and while the live Splunk contract
  is being completed.
- **Splunk data**, requested through
  `fetchSplunkReport.postSplunkQuery`.

The active source is controlled by the `DASHBOARD_DATA_SOURCE` environment
variable:

- `DASHBOARD_DATA_SOURCE=mock` uses the mock JSON files.
- `DASHBOARD_DATA_SOURCE=splunk` uses the Splunk request path.

During my Splunk test, the request reached `postSplunkQuery`, but the response
was HTML rather than the expected JSON. This still needs to be investigated
before the Splunk response can be mapped and used by the dashboard. Until the
response contract is confirmed and the mapping is completed, the mock source
remains the working source for the Product Owner dashboard.

I also reviewed, simplified, and refined the initial Product Owner dashboard
connection documentation. The updated version is included with this email.

## Attached documentation

- **`dashboard-structure.md`** — Describes the structure of the Executive,
  Product Owner, Tech Team, and Operations Team dashboards, including their
  pages, drawers, shared dashboard components, filters, types, and mock data.
- **`product-owner-dashboard-data-connection.md`** — Explains the current
  Product Owner dashboard data flow, the mock and Splunk paths, the
  `DASHBOARD_DATA_SOURCE` configuration, and the remaining integration work.
  This is the reviewed and refined version of the initial connection
  documentation.
- **`splunk-azure-function.md`** — Summarizes the Azure Function used by
  `postSplunkQuery`, including its request and response contract, authentication,
  Splunk job execution, and its relationship with the report service.
- **`technical-debt-splunk-response-failure.md`** — Documents the current
  Splunk loader failure behavior and the work needed to return a safe,
  well-defined response to the dashboard.
- **`technical-debt-dashboard-validation-and-response-adaptation.md`** —
  Describes the missing request validation and response adaptation work that
  should be completed once the live Splunk contract is established.
- **`technical-debt-remove-dashboard-mock-source.md`** — Provides the steps and
  completion criteria for removing the mock data pipeline after the Splunk
  integrations are stable and verified.

## Pull requests to review and merge

Raluca has created two pull requests that should be reviewed and merged in this
order:

1. **Tech Team dashboard connection to the Splunk report service**
2. **Caching system for Splunk requests**

The connection pull request should be merged first because the caching work
builds on the Splunk request flow.

## Suggested next steps

1. Review and merge Raluca's pull requests in the order specified above.
2. Test the caching system after both pull requests are merged, including cache
   hits, misses, expiration, error handling, and behavior across the dashboard
   request flows.
3. Investigate why `postSplunkQuery` received an HTML response instead of JSON.
4. Once the Splunk connection is established, implement the response field mapping.
5. Update the hand-over documentation to reflect the Tech Team dashboard
   connection and the final caching behavior.
6. Review and prioritize the attached technical-debt items:
   - resolve the Splunk loader failure behavior;
   - implement request validation and response adaptation once the Splunk
     contract is known; and
   - remove the mock data source only after the live integrations are stable.
7. Plan and implement the Splunk integration for the remaining dashboards,
   reusing the established connection and caching patterns where appropriate.

Thanks,

[Your name]
