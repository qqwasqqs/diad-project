# Hand-over — Dashboard Structure

## Purpose of this document

This file describes **the structure of the four dashboards we added** and the
components they are built from. It is a map of _where things live and how they
fit together_, not a description of the business logic, the KPI definitions, or
the data connection.

Data loading (hooks, services, API routes, Splunk) is deliberately **out of
scope here**; it is covered by its own hand-over file. It is only mentioned
where it is needed to explain how a page gets its payload.

### Context

The project was started by another team. We took it over **only to add the four
AI-Observability dashboards**. Everything outside the areas listed in this
document (login, ACL/RBAC, Databricks-backed pages such as
`data-quality-dashboard`, `pipelines-dashboard`, `kpi-dashboard`, `governance`,
`rules-management`, `roles-management`, the sidenav itself, etc.) is inherited
code that we did not own.

> Older documents under `docs/` describe earlier iterations and are partly
> outdated. The code is the source of truth. This document was written from the
> code as of the hand-over date.

---

## 1. The four dashboards

| Dashboard       | Route                             | Page file                                                     |
| --------------- | --------------------------------- | ------------------------------------------------------------- |
| Executive       | `/home/executive-dashboard`       | [page.tsx](../../app/home/executive-dashboard/page.tsx)       |
| Product Owner   | `/home/product-owner-dashboard`   | [page.tsx](../../app/home/product-owner-dashboard/page.tsx)   |
| Tech Team       | `/home/tech-team-dashboard`       | [page.tsx](../../app/home/tech-team-dashboard/page.tsx)       |
| Operations Team | `/home/operations-team-dashboard` | [page.tsx](../../app/home/operations-team-dashboard/page.tsx) |

Route constants are declared in [constants/routes.ts](../../constants/routes.ts)
(`EXECUTIVE_DASHBOARD_ROUTE`, `TECH_TEAM_DASHBOARD_ROUTE`,
`PRODUCT_OWNER_DASHBOARD_ROUTE`, `OPERATIONS_TEAM_DASHBOARD_ROUTE`).

All four pages are client components (`"use client"`) that sit inside the
inherited dashboard shell: `app/layout.tsx` → `app/home/layout.tsx` →
`components/layout/Header.tsx` + `components/layout/Sidenav.tsx`.

Sidenav entries are **not** hard-coded by us: the menu is served by the
inherited `/api/dashboard-modules` route from a Databricks table, so in a local
environment the dashboards are reached directly by URL.

---

## 2. The anatomy every dashboard follows

Each page is assembled from the same building blocks, in the same order:

```
DashboardPage                       page frame + header + global filter bar
 └─ IllustrativeValuesBanner        "values are illustrative" notice
 └─ DashboardGrid                   responsive panel grid (2 or 12 columns)
     └─ DashboardPanel              one bordered section ("single" or "segmented")
         ├─ DashboardSectionAction  the "…" button that opens the drawer
         ├─ MetricCard / StatusCallout / DashboardLineChart / chart components
         └─ DashboardSectionInfo    optional footnote explaining the section
 └─ <Section>Drawer × N             one detail drawer per main-view section
```

Key structural rules we kept across all four dashboards:

- **A page is presentation only.** It receives an already-aggregated payload
  from its hook and performs no metric calculation.
- **One drawer per main-view element.** A drawer deepens exactly one section and
  never merges two, even when two elements share a panel. A segmented panel
  therefore carries one action (and one drawer) _per region_.
- **Missing data is explicit.** A metric without an approved definition renders
  a pending state (`PendingStateValue`, `DataPendingCard`, `StatusCallout`
  warning variant) and is never shown as `0` or a dash.
- **The scope filters are global.** The filter bar lives in the page header and
  its selection is shared via a store, so changing a filter re-scopes every
  panel, and the drawers too.

### Page structure per dashboard

**Executive** — `DashboardGrid columns={12}`, 4 panels, 4 drawers:

| Panel                                              | Drawer                 |
| -------------------------------------------------- | ---------------------- |
| Executive pulse (5 metric cards)                   | `ExecutivePulseDrawer` |
| Session & Query Volume (dual-axis line chart)      | `EngagementDrawer`     |
| Cost by BU and Project (`CostByBusinessUnitChart`) | `CostAllocationDrawer` |
| Safety & risk posture (3 `StatusCallout`)          | `SafetyAndRiskDrawer`  |

**Product Owner** — 6 panels, 5 drawers:

| Panel                                                                                     | Drawer                                     |
| ----------------------------------------------------------------------------------------- | ------------------------------------------ |
| Product experience pulse (segmented: volume / error rate / latency / workflow completion) | `ProductOwnerProductExperiencePulseDrawer` |
| Adoption and engagement                                                                   | `ProductOwnerAdoptionAndEngagementDrawer`  |
| Channel mix                                                                               | `ProductOwnerChannelMixDrawer`             |
| Experience and response quality                                                           | `ProductOwnerExperienceQualityDrawer`      |
| Feature usage evidence                                                                    | — (pending state only)                     |
| Trust and measurement readiness (segmented)                                               | `ProductOwnerTrustEvidenceDrawer`          |

**Tech Team** — 5 panels, 6 drawers (the first panel is segmented and owns two):

| Panel                                  | Drawer                                                      |
| -------------------------------------- | ----------------------------------------------------------- |
| Request-path health (segmented)        | `RequestPathLatencyDrawer` + `RequestPathDiagnosticsDrawer` |
| Failure localization                   | `FailureLocalizationDrawer`                                 |
| Capacity and efficiency                | `CapacityAndEfficiencyDrawer`                               |
| AI and model quality                   | `AiModelQualityDrawer`                                      |
| Evaluator readiness and security tests | `EvaluatorReadinessDrawer`                                  |

**Operations Team** — 6 panels, 7 drawers (service-path stability is segmented):

| Panel                              | Drawer                                                           |
| ---------------------------------- | ---------------------------------------------------------------- |
| Operational situation              | `OperationalSituationDrawer`                                     |
| Requested operations coverage      | `RequestedOperationsCoverageDrawer`                              |
| Service-path stability (segmented) | `ServicePathStabilityDrawer` + `ServicePathRuntimeContextDrawer` |
| Failure surface                    | `FailureSurfaceDrawer`                                           |
| Operational control coverage       | `OperationalControlCoverageDrawer`                               |
| Safety and security readiness      | `SafetyAndSecurityReadinessDrawer`                               |

---

## 3. Shared dashboard components — `components/shared/dashboard`

These are the components we created for the four dashboards. They are the
vocabulary of the pages; prefer composing them over writing new one-off markup.

**Page frame and layout**

| Component                  | Role                                                                                                                                                                                          |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DashboardPage`            | Page wrapper: title, description, header with filters and export.                                                                                                                             |
| `DashboardHeader`          | Title block plus the global filter row and export control.                                                                                                                                    |
| `DashboardGrid`            | Responsive grid. `columns={2}` (default) or `columns={12}` with `xl:col-span-*` children.                                                                                                     |
| `DashboardPanel`           | A bordered section. `template="single"` or `template="segmented"` (regions declared via `sections`, each with its own title, action and footer, and an optional `weight` for unequal widths). |
| `DashboardSectionAction`   | The subtle "…" button that opens a drawer.                                                                                                                                                    |
| `DashboardSectionInfo`     | Panel footnote explaining what a section does/does not measure.                                                                                                                               |
| `PanelFootnote`            | Small qualifying note under panel or drawer content.                                                                                                                                          |
| `IllustrativeValuesBanner` | Banner stating that displayed values are illustrative.                                                                                                                                        |

**Value rendering**

| Component                  | Role                                                                             |
| -------------------------- | -------------------------------------------------------------------------------- |
| `MetricCard`               | Icon + title + primary value + supporting content card.                          |
| `MetricList`               | Label/value rows.                                                                |
| `MetricContextTable`       | Provenance table used in drawers (source, definition, caveats).                  |
| `StatusCallout`            | Emphasised status block (`warning` / `success` / `danger` / `neutral`).          |
| `DashboardSupportingStats` | Row of small supporting values under a chart (rendered by `DashboardLineChart`). |
| `PendingStateValue`        | Renders an approved pending state instead of a value.                            |
| `DataPendingCard`          | Whole-panel pending state.                                                       |

**Charts**

| Component                                      | Role                                                                        |
| ---------------------------------------------- | --------------------------------------------------------------------------- |
| `DashboardLineChart`                           | Line chart with optional dual axes, tick formatters and supporting stats.   |
| `components/shared/charts/HorizontalBarList`   | Ranked horizontal bars, optionally multi-column.                            |
| `components/shared/charts/PositiveNegativeBar` | Split positive/negative bar (e.g. feedback).                                |
| `components/shared/charts/StackedAreaChart`    | Stacked area trend.                                                         |
| `components/charts/CostByBusinessUnitChart`    | Executive cost allocation chart (added by us next to the inherited charts). |

**Filters and drawers**

| Component                              | Role                                                                                                                                                                       |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DashboardFilters` / `DashboardFilter` | The scope controls: period, business unit, project, app.                                                                                                                   |
| `DashboardDrawer`                      | Fluent UI drawer shell (default and `wide` sizes, header, body, footer).                                                                                                   |
| `DetailDrawer`                         | The dashboard drawer shell on top of `DashboardDrawer`: header, illustrative-values banner, children, provenance table, blocking decisions, notes, optional scope filters. |
| `useDrawerFilters`                     | Local filter state for drawers that filter independently.                                                                                                                  |

---

## 4. Drawers — `components/drawers`

```
components/drawers/
├─ DrawerSection.tsx      titled block inside a drawer
├─ DrawerRowList.tsx      label/value rows from payload rows (pending-aware)
├─ DrawerStatGrid.tsx     row of compact value cards at the top of a drawer
├─ executive/            4 drawers
├─ product-owner/        5 drawers
├─ tech-team/            6 drawers
└─ operations/           7 drawers
```

A drawer is always built the same way:

```tsx
<DetailDrawer open={open} onClose={onClose} content={content} size="wide">
  <DrawerSection title="…">
    <DrawerRowList rows={content?.someRows ?? []} />
  </DrawerSection>
  …
</DetailDrawer>
```

- `DetailDrawer` owns the common anatomy, so a drawer file only contains the
  element-specific middle section.
- `DrawerRowList` / `DrawerStatGrid` own the pending-state rule, so individual
  drawers never fall back to `"-"` or `0`.
- Opening state is owned by the page. Executive, Tech Team and Operations use a
  single `openDrawer` state typed as a `DrawerKey` union; Product Owner uses one
  boolean per drawer. Both patterns exist in the code today — the `DrawerKey`
  union is the one to follow for new work.
- Drawer content comes from the page payload (`data.drawers.<key>` for
  Executive / Tech Team / Operations) or from dedicated payloads for Product
  Owner, and is passed down as a prop. Drawers do not fetch.

---

## 5. Types — `types`

Shared primitives live in [types/dashboard.ts](../../types/dashboard.ts):
`PendingState`, `Series`, `SeriesPoint`, `MetricRow`, `ContextRow`,
`DrawerContent`, `DashboardFilters`, `DashboardFilterSelection`,
`DashboardFilterOption(s)`.

Per-persona payload shapes (main view + drawer contents) live in:

- [types/executiveDashboard.ts](../../types/executiveDashboard.ts)
- [types/productOwnerDashboard.ts](../../types/productOwnerDashboard.ts) and
  [types/productOwnerDashboardModels.ts](../../types/productOwnerDashboardModels.ts)
- [types/techTeamDashboard.ts](../../types/techTeamDashboard.ts)
- [types/operationsDashboard.ts](../../types/operationsDashboard.ts)
- [types/dashboardEndpointDtos.ts](../../types/dashboardEndpointDtos.ts) for the
  generic metrics/timeseries endpoint DTOs.

---

## 6. Filters

The scope selection (period, business unit, project, app) is global state in
[store/dashboardFiltersStore.ts](../../store/dashboardFiltersStore.ts).

- `DashboardFilters` renders the controls in the page header; options come from
  `useDashboardFilterOptions`.
- Pages read the selection with `useSelectedDashboardFilters()` (Executive,
  Tech Team, Operations) or directly from the store (Product Owner) and pass it
  into their data hook, which keys its cache on it — so changing a filter
  refetches the payload for the new scope.
- `useDrawerFilters` exists for drawers that need their own local filter state
  instead of the global one.

---

## 7. Mock data — `public/mocks/new-pages`

Local, front-end-only development runs entirely on static JSON:

| File                                          | Used by                               |
| --------------------------------------------- | ------------------------------------- |
| `executive-dashboard.json`                    | Executive main view + drawers         |
| `tech-team-dashboard.json`                    | Tech Team main view + drawers         |
| `operations-team-dashboard.json`              | Operations main view + drawers        |
| `product-owner-dashboard.json`                | Product Owner main view               |
| `product-owner-product-experience-pulse.json` | PO pulse drawer                       |
| `product-owner-adoption-and-engagement.json`  | PO adoption drawer                    |
| `product-owner-channel-mix.json`              | PO channel mix drawer                 |
| `product-owner-experience-quality.json`       | PO experience quality drawer          |
| `product-owner-trust-evidence.json`           | PO trust evidence drawer              |
| `dashboard-filters.json`                      | Global filter options (not page data) |
| `sample-dashboard.json`                       | Example payload for new pages         |

The files are read by the `main-view` API routes under `app/api/<dashboard>/`
and by [lib/dashboard/mockSource.ts](../../lib/dashboard/mockSource.ts) /
[filterOptionsSource.ts](../../lib/dashboard/filterOptionsSource.ts). See
[public/mocks/new-pages/README.md](../../public/mocks/new-pages/README.md) for
the conventions, including the `weight` field that scales mock values per
selected application.

---

## 8. Data connection (pointer only)

For completeness, these are the layers that connect the dashboards to Splunk.
They exist, they belong to the dashboards we added, and they are documented
separately — **see the data-connection hand-over file, not this one**:

- `hooks/useExecutiveDashboard.ts`, `hooks/useProductOwnerDashboardEndpoints.ts`,
  `hooks/useTechTeamDashboard.ts`, `hooks/useOperationsDashboard.ts`,
  `hooks/useDashboardFilterOptions.ts`, `hooks/useSelectedDashboardFilters.ts`
- `lib/services/executiveDashboardService.ts`,
  `productOwnerDashboardService.ts`, `techTeamDashboardService.ts`,
  `operationsDashboardService.ts`, `dashboardEndpointService.ts`,
  `dashboardFiltersService.ts`, `splunkReportService.ts`
- `lib/dashboard/mockSource.ts`, `filterOptionsSource.ts`,
  `productOwnerEndpointAdapter.ts`
- `app/api/executive-dashboard/main-view`,
  `app/api/product-owner-dashboard/main-view`,
  `app/api/tech-team-dashboard/main-view`,
  `app/api/operations-team-dashboard/main-view`,
  `app/api/dashboard/{metrics,timeseries,filters}`

The flow is: **page → hook → service → API route → source (mock JSON today,
Splunk when connected) → payload → components**.

---

## 9. Where to start when picking this up

1. Open [app/home/executive-dashboard/page.tsx](../../app/home/executive-dashboard/page.tsx)
   — it is the smallest and most representative page.
2. Follow one section to its drawer, e.g. `ExecutivePulseDrawer`, to see the
   `DetailDrawer` + `DrawerSection` + `DrawerRowList` pattern.
3. Open `executive-dashboard.json` to see the payload shape the page expects.
4. Only then look at the hook/service/API layer, using the data-connection
   hand-over document.
