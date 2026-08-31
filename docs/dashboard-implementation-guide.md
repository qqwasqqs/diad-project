# Persona Dashboard Implementation Guide

How to turn an approved persona dashboard design into a working page in this
repository.

This is the implementation half of the work. The design half — concept,
calculation specifications, clickability map, and the approval gates — is
covered by the per-dashboard folders under `docs/` and by the design procedure
those documents cite. Note that the procedure itself (`dashboard-design-procedure.md`)
is referenced from several specifications but is **not present in this
repository**; it lives with the design deliverables.

Start only from an approved design. Every rule below exists because a
specification requires it, not because of a preference about code.

## The reference implementation

The Technical Teams dashboard is the worked example. When something here is
unclear, read those files:

| Layer | File |
| --- | --- |
| Contract | `types/techTeamDashboard.ts` |
| Mock source | `public/mocks/new-pages/tech-team-dashboard.json` |
| Route (the data seam) | `app/api/tech-team-dashboard/main-view/route.ts` |
| Service | `lib/services/techTeamDashboardService.ts` |
| Hook | `hooks/useTechTeamDashboard.ts` |
| Page | `app/home/tech-team-dashboard/page.tsx` |
| Drawer shell | `components/ui/tech-team-dashboard/TechTeamDetailDrawer.tsx` |

## The path

The repository's data path is page → hook → service → route. A page never
fetches, and never talks to a data source directly.

```
page.tsx  ->  hooks/use<Persona>Dashboard.ts  ->  lib/services/<persona>DashboardService.ts
                                                            |
                                                  app/api/<persona>-dashboard/main-view/route.ts
                                                            |
                                          local mock  |  approved Splunk/API source
```

The route is the only place that knows where data comes from. Everything above
it speaks the dashboard's contract, so swapping a mock for a real source changes
one file.

## Steps

### 1. Write the contract first

Define the response shape in `types/<persona>Dashboard.ts`.

Make it the shape **the dashboard needs**, not the shape the source happens to
produce. Mapping a source onto the contract is the route's job. Getting this
backwards is what forces a rewrite when the real source arrives.

Reuse the shared row and state vocabulary rather than redefining it. A metric row
carries either a display-ready `value` or a `pendingState` — never both, never
neither.

### 2. Build the mock as a source, not a response

Put it in `public/mocks/new-pages/<persona>-dashboard.json`, per that folder's
README.

Store the widest range the filters can request (90 days if the period filter
offers 90 days) and keep numeric amounts with their units, rather than
pre-formatted strings. The route then slices and formats. A mock of finished
strings cannot be filtered, and you will rewrite it the first time a filter has
to work.

### 3. Write the route

Responsibilities, in order:

1. read the filters from the query string;
2. choose the source — `isLocalDesignModeServer()` selects the mock;
3. apply the selected scope;
4. map onto the contract and return it.

Outside local design mode, fail loudly. A route that quietly serves mock data in
a deployed environment produces numbers indistinguishable from measured ones.

### 4. Service and hook

The service wraps the endpoint and passes the filters as params. The hook wraps
the service in `useQuery` and puts the filters in the query key, so each scope
caches independently.

Both are thin. Neither should contain logic.

### 5. Build the page

The page is presentation only. It reads the hook, maps payload rows onto shared
components, and holds drawer open/close state.

Opt in to the global filter bar by reading `store/dashboardFiltersStore` and
passing the selection to the hook. The bar is rendered by the shared header for
every dashboard; reading the store is what makes a page actually honour it.

### 6. Build the drawers

One drawer per clickable element in the approved clickability map. A drawer
deepens exactly one element and never merges two, even when they share a panel —
in the Technical Teams view the latency chart and the diagnostics list sit in one
panel and have separate drawers.

Every drawer has the same anatomy: header, illustrative-values banner,
element-specific content, provenance table, decisions register, notes. Only the
element-specific content differs.

## Which component for which design element

| Design element | Component |
| --- | --- |
| Page shell, header, filters, export | `DashboardPage` |
| Responsive panel grid | `DashboardGrid` (`columns={12}` for unequal widths) |
| Panel, one or several regions | `DashboardPanel` (`sections[].weight` for unequal splits) |
| The `...` control that opens a drawer | `DashboardSectionAction` |
| Right-side detail drawer | `DashboardDrawer` |
| Trend chart, one or more series | `DashboardLineChart` (left/right axes, supporting stats) |
| Horizontal rate/share bars | `HorizontalBarList` (`rowsPerColumn`, `max`) |
| Positive/negative split bar | `PositiveNegativeBar` |
| Label + value rows | `MetricList` (`compact`, or `prominent` for icon badge and large value) |
| Single metric card | `MetricCard` (icon optional) |
| KPI row | `DashboardKpiGrid` + `DashboardKpiCard` |
| Icon badge with stacked title and status | `StatusCallout` |
| Supporting values beside a chart | `DashboardSupportingStats` |
| An approved unavailable-data state | `PendingStateValue` |
| Whole region with no data yet | `DataPendingCard` |
| Page-level illustrative notice | `IllustrativeValuesBanner` |
| A qualification needed to read a panel | `PanelFootnote` |
| Calculation / scale / coverage table | `MetricContextTable` |

Check this table before writing a new component. Several of these were built for
one dashboard and are reusable as-is.

## Rules that are not negotiable

These come from the calculation specifications and apply to every persona.

**Missing data is never zero.** A metric without an approved definition,
formula, calculation, data source, or test result renders its approved pending
state. Not `0`, not blank, not a dash. Use `PendingStateValue`; it deliberately
offers no numeric fallback.

**A pending state is never replaced by a value** — not by a filter selection, not
by a default, not by a fallback.

**Unattributable scope is stated, not ignored.** A metric may apply a business
unit, project, or channel filter only where its source event is reliably
attributed through an approved contract. Otherwise it returns
`filter-breakdown`, which renders as `FILTER BREAKDOWN UNAVAILABLE`. Never
return a portfolio-wide value while a narrower scope is selected.

**Incompatible scales stay separate.** A `1–5` evaluator score and a `0–1`
score never share an axis and are never combined into a composite. Show them as
separate values with their scales visible.

**Rates with different denominators are compared, never summed.** Each
workload-specific failure rate has its own eligible unit. There is no combined
failure rate.

**Colour is never the only signal.** Status is carried by text, with colour as
reinforcement. Green means a confirmed favorable state and red a confirmed risk;
neither is available for anything else, which is why the chart series palette
contains no green or red.

**Illustrative values are labelled as such** for as long as they are
illustrative, via `IllustrativeValuesBanner`. The banner is not dismissible.

## Theme

Use tokens, not literal colours.

- `--color-text-primary` for body text. The `--color-neutral-foreground-*`
  scale is brand green and blue, reserved for status and accents.
- `--color-chart-series-1..6` for data series, keeping a metric on the same
  token everywhere it appears.
- `--color-chart-grid`, `--color-chart-axis` for chart chrome.
- `--color-warning-*`, `--color-success-*`, `--color-danger-*` for status.

## Before starting: known gaps

- `components/shared/dashboard/DashboardFilterDrawer.tsx` and
  `DashboardTitle.tsx` are **empty files**. They are not components.
- `components/charts/CostByBusinessUnitChart.tsx` exists but is imported
  nowhere. It appears to target the Executive "Cost by BU and Project" element;
  check it against that specification before building anything new for grouped
  allocation bars.
- `components/shared/dashboard/_MetricCard.tsx` sits alongside `MetricCard.tsx`.
  Confirm which is current before extending either.
- No AI Observability dashboard other than Technical Teams has a data layer.
  `executiveDashboardService` and `useExecutiveDashboard` serve the Data
  Integrity side and are not a starting point for the Executive AI Observability
  dashboard.
- Several shared components have no specification under `docs/shared-components`.
  The catalog is not a complete inventory; the component directory is.

## Verification

Before opening a pull request:

- `npx tsc --noEmit`
- `npx eslint <files you changed>` — the repository has pre-existing lint errors,
  so lint the files you touched rather than the whole project
- `npm run build`, which currently needs a non-empty `KEY_VAULT_URL`:
  `lib/azure/keyvault.ts` throws at module evaluation with no local-mode guard
- Check the layout at 1280 and 1440 as well as full width. Laptop widths are
  where panel splits and long metric labels break first.
