# Connect the Next.js dashboard to Splunk

## Summary

Connect the current Next.js dashboard to Splunk through the two shared
application-facing endpoints:

- `POST /api/dashboard/metrics`
- `POST /api/dashboard/timeseries`

The work has two independent parts:

1. The Splunk team configures and tests the saved-search-backed endpoint flow.
2. The Next.js team maps the fields returned by Splunk to the application's
   internal objects using the new OpenTelemetry (OTEL) schemas.

Neither part must wait for the other. Part 1 can be tested against the agreed
endpoint contract while Part 2 proceeds from Hugo's old-to-new field mapping.

## Contract references

- [Shared dashboard endpoint requests and responses](../docs/endpoints/shared-dashboard-endpoints.md)
- [Product Owner Splunk data contract](../docs/endpoints/product-owner-dashboard-splunk-data-contract.md)

The endpoint contract documents are the source of truth for request fields,
response shapes, metric identifiers, result aliases, and availability statuses.

## Part 1: Splunk endpoint configuration and cURL testing

### Objective

Prove that Splunk can receive the documented request parameters, apply them to
the correct saved searches, return the requested aggregates, and report the
effective filters in response metadata.

The `/api/dashboard/*` paths are application-facing contract paths, not
built-in Splunk paths. They can be implemented by a Next.js API facade that
calls Splunk's REST API or by another approved integration layer. Regardless of
where the facade runs, its request and response JSON must match the documented
contract.

### Splunk implementation note

Splunk saved searches can be defined as template searches. The saved-search
dispatch REST endpoint accepts `args.*` values for template placeholders, and
dispatch properties can supply search-time overrides. The integration layer can
therefore translate the endpoint filters into validated saved-search arguments,
dispatch the appropriate saved search, retrieve its results, and shape those
results into the metrics or timeseries response.

Official Splunk references:

- [Search endpoint descriptions](https://help.splunk.com/en/splunk-enterprise/rest-api-reference/10.2/search-endpoints/search-endpoint-descriptions) — see `saved/searches/{name}/dispatch`, `args.*`, `dispatch.*`, `search/jobs`, and search-job custom properties.
- [Creating searches using the REST API](https://help.splunk.com/en/splunk-enterprise/leverage-rest-apis/rest-api-tutorials/9.2/rest-api-tutorials/creating-searches-using-the-rest-api) — covers creating search jobs and retrieving results through `/search/jobs/{search_id}/results`.
- [The `savedsearch` command](https://help.splunk.com/en/splunk-enterprise/spl-search-reference/10.2/search-commands/savedsearch) — documents replacement values for placeholders in saved searches.

All incoming values must be validated and safely translated to approved search
arguments. Do not concatenate unchecked request values into SPL.

### Returning applied filters as metadata

Both endpoint responses must include the filters that were actually applied,
not merely copy unvalidated input. At minimum, return:

```json
{
  "meta": {
    "appliedFilters": {
      "timeRange": "last_30_days",
      "businessUnits": ["all"],
      "projects": ["all"],
      "timezone": "UTC"
    }
  }
}
```

Splunk documents custom search-job properties through `custom.*`, which can be
retrieved with the search-job details. A saved search can also return explicit
fields containing the normalized applied values. The integration layer can use
either approach and serialize the values under `meta.appliedFilters` in the
application response. See the `search/jobs` and custom-property sections in the
[Splunk search endpoint reference](https://help.splunk.com/en/splunk-enterprise/rest-api-reference/10.2/search-endpoints/search-endpoint-descriptions).

If a requested filter cannot be applied reliably to a metric or series, do not
claim that it was applied. Return the contract's
`FILTER_BREAKDOWN_UNAVAILABLE` status and a reason.

### cURL tests

Replace the base URL and authentication value with the integration-environment
values supplied to the Splunk team.

#### Metrics endpoint

```bash
curl --fail-with-body --silent --show-error \
  --request POST "${DASHBOARD_API_BASE_URL}/api/dashboard/metrics" \
  --header "Authorization: Bearer ${DASHBOARD_API_TOKEN}" \
  --header "Content-Type: application/json" \
  --data-binary '{
    "dashboard": "product-owner",
    "sections": [
      "product-experience-pulse",
      "trust-and-measurement-readiness"
    ],
    "metrics": [
      "session-query-volume",
      "user-satisfaction-rate",
      "end-to-end-latency-p95",
      "workflow-completion",
      "safety-evaluators",
      "mlflow-safety-score",
      "pii-leakage-agent-only",
      "upia"
    ],
    "filters": {
      "timeRange": {
        "type": "relative",
        "value": "last_30_days"
      },
      "businessUnits": ["all"],
      "projects": ["all"],
      "timezone": "UTC"
    },
    "options": {
      "includePending": true,
      "includeCoverage": true
    }
  }'
```

#### Timeseries endpoint

```bash
curl --fail-with-body --silent --show-error \
  --request POST "${DASHBOARD_API_BASE_URL}/api/dashboard/timeseries" \
  --header "Authorization: Bearer ${DASHBOARD_API_TOKEN}" \
  --header "Content-Type: application/json" \
  --data-binary '{
    "dashboard": "product-owner",
    "chartId": "adoption-and-engagement",
    "metrics": ["sessions", "queries"],
    "filters": {
      "timeRange": {
        "type": "relative",
        "value": "last_30_days"
      },
      "businessUnits": ["all"],
      "projects": ["all"],
      "timezone": "UTC"
    },
    "granularity": "day",
    "options": {
      "includeSupportingStats": true
    }
  }'
```

Repeat the tests with known non-`all` business-unit and project values so that
the team can demonstrate that the parameters affect the search scope and that
the effective values are returned in `meta.appliedFilters`.

### Part 1 deliverables

- Saved-search-to-metric and saved-search-to-chart routing list.
- Working integration endpoints for metrics and timeseries requests.
- cURL commands and captured JSON responses for both endpoints.
- Evidence that time range, business unit, project, and timezone are applied.
- Applied filters returned under `meta.appliedFilters` for both endpoints.
- Evidence for one non-`all` business-unit/project test.
- Documented authentication method, required Splunk permissions, base URL, and
  environment used for testing. Do not store credentials in the repository.
- Documented error responses for invalid parameters and failed searches.

### Part 1 acceptance criteria

- Both cURL requests return valid JSON and the expected HTTP status.
- Responses conform to the structures and status values in the shared endpoint
  contract.
- Each requested metric or series returns either a valid value or an explicit
  availability/error status; unavailable values are not represented as zero.
- Both responses contain `meta.appliedFilters` with the normalized effective
  `timeRange`, `businessUnits`, `projects`, and `timezone` values.
- Changing an approved business-unit or project parameter changes the applied
  search scope and the returned metadata.
- Results contain only approved aggregates and do not expose raw prompts,
  responses, identifiers, evaluator reasons, or other restricted content.

## Part 2: OTEL field mapping to Next.js objects

### Objective

Map the fields returned by Splunk to the internal TypeScript objects used by
the Next.js application. The current documentation uses the old schemas, but
the implementation must use the new OTEL schemas.

### Required input

Hugo will provide a document that maps each old field to its corresponding new
OTEL field. This document is an input to Part 2 only and does not block Part 1.

### Work

- Review Hugo's old-to-new field mapping.
- Create a mapping matrix containing:
  - old documented field;
  - new OTEL field and source location;
  - Splunk result alias;
  - target Next.js object property;
  - type, unit, nullability, and required conversion;
  - affected metric or timeseries.
- Identify missing, ambiguous, or incompatible mappings and return them to the
  relevant owner for confirmation.
- Update the Next.js Splunk response types and adapter/mapping layer.
- Preserve the endpoint status semantics, including `NO_DATA`,
  `DATA_PENDING`, `CALCULATION_PENDING`, `FILTER_BREAKDOWN_UNAVAILABLE`, and
  `ERROR`.
- Add tests for valid values, missing values, pending statuses, invalid payloads,
  and unit conversions.
- Update the endpoint/data-contract documentation to use the approved OTEL names
  after the mapping is confirmed.

### Part 2 deliverables

- Approved old-schema-to-OTEL-to-Next.js mapping matrix.
- Updated TypeScript response types and mapping adapters.
- Automated mapping and validation tests.
- Updated contract documentation using approved OTEL field names.
- A short list of unresolved fields, owners, and required decisions, if any.

### Part 2 acceptance criteria

- Every Splunk field required by the metrics and timeseries contracts has an
  approved OTEL mapping or an explicit unresolved status.
- No implementation mapping relies solely on an obsolete field name.
- Units, types, nullability, and status handling are explicit and tested.
- Unknown fields and invalid payloads fail safely without inventing dashboard
  values.
- The application can convert representative Splunk responses into the expected
  internal objects.

## Dependencies and sequencing

- Part 1 depends on Splunk access, credentials, saved-search ownership, and an
  agreed integration base URL.
- Part 2 depends on Hugo's old-to-new OTEL mapping document.
- Part 1 does not depend on Hugo's mapping document.
- Part 2 does not depend on the endpoint tests being completed; representative
  contract payloads can be used until live responses are available.

## Out of scope

- Product Owner drawer-specific endpoints.
- New dashboard metrics or calculated values outside the current contracts.
- Fabricating mappings, formulas, values, or filter attribution when the source
  evidence is unavailable.
- Storing Splunk credentials or tokens in source control.
