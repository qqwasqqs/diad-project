# New Page Mock Data

Use this folder for local, static JSON payloads used by new pages during design/development.

## Conventions

- Keep files page-scoped (for example `quality-overview.json`, `pipeline-cards.json`).
- Keep payloads deterministic and small.
- Prefer stable keys so UI development does not break when fields are reordered.

## Usage

Client components can fetch directly from `/mocks/new-pages/<file>.json`.

Example:

```ts
const response = await fetch('/mocks/new-pages/sample-dashboard.json');
const data = await response.json();
```

## Filter options

`dashboard-filters.json` is not page data. It holds the values the global filter
bar offers for each data-derived dimension (business unit, project, app), served
by `/api/dashboard/filters` in local design mode. The period filter is not in
here: it is a fixed request parameter rather than a value found in the data.

The application list came from the product owner, not from `docs/` — no
document in the repository names an application. The values are spelled as
`application_name` carries them rather than slugged, because the real source
returns that field verbatim, so a value in this file is exactly what the metrics
endpoint will receive. Confirm each spelling against the distinct
`application_name` values in Splunk before the source is connected: a label that
reads correctly but does not match the field filters nothing.

Note that several views forbid naming applications in their content (see the
tech-team failure-localization, operations control-coverage, and product-owner
channel-mix specs). That constraint is about what a drawer may display, not
about the scope selector, but it is worth re-reading before an application name
is rendered anywhere other than this filter.

Each option carries a `weight` that the real source will not return. It is the
illustrative scaling `lib/dashboard/mockSource` applies to mock metrics when the
value is selected, kept beside the option so a new app also moves the numbers.
The endpoint strips it before serving the options.
