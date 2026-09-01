# Shared Dashboard Components

Specifications for the components the persona dashboards are built from.

Each folder holds one component's contract, behaviour, and design principles.
For how these fit together into a working dashboard, see the
[Persona Dashboard Implementation Guide](../dashboard-implementation-guide.md).

## Specified

| Component | Purpose | Source |
| --- | --- | --- |
| [Dashboard Grid](dashboard-grid/README.md) | Arranges a main view's panels | `DashboardGrid.tsx` |
| [Dashboard Header](dashboard-header/README.md) | Title, subtitle, filter bar, export | `DashboardHeader.tsx` |
| [Dashboard Panel](dashboard-panel/README.md) | Panel surface, single or segmented | `DashboardPanel.tsx` |
| [Dashboard Section Action](dashboard-section-action/README.md) | The control that opens a drawer | `DashboardSectionAction.tsx` |
| [Dashboard Drawer](dashboard-drawer/README.md) | Right-side drawer surface | `DashboardDrawer.tsx` |
| [Detail Drawer](detail-drawer/README.md) | The composed drawer anatomy | `DetailDrawer.tsx` |
| [Line Chart](line-chart/README.md) | One or more trend series | `DashboardLineChart.tsx` |
| [Horizontal Bar List](horizontal-bar-list/README.md) | Compact horizontal-bar rows | `HorizontalBarList.tsx` |
| [Metric Card](metric-card/README.md) | Single metric summary | `MetricCard.tsx` |
| [Metric List](metric-list/README.md) | Ordered label-and-value rows | `MetricList.tsx` |
| [Metric Context Table](metric-context-table/README.md) | Calculation, scale, coverage | `MetricContextTable.tsx` |
| [Status Callout](status-callout/README.md) | Compact icon-and-text status | `StatusCallout.tsx` |
| [Pending State Value](pending-state-value/README.md) | An approved unavailable-data state | `PendingStateValue.tsx` |
| [Illustrative Values Banner](illustrative-values-banner/README.md) | Page-level illustrative notice | `IllustrativeValuesBanner.tsx` |
| [Panel Footnote](panel-footnote/README.md) | A qualification needed to read a panel | `PanelFootnote.tsx` |

## Not yet specified

These exist in `components/shared` and are usable, but have no specification
here. **This catalog is not a complete inventory of what is available — the
component directory is.** Check there before building anything new.

- `DashboardPage` — page shell that renders the header
- `DashboardSection` — section wrapper with an actions slot
- `DashboardSupportingStats` — supporting values beside a chart
- `DashboardKpiGrid`, `DashboardKpiCard` — KPI row
- `DashboardFilters`, `DashboardFilter` — the global filter bar and one control
- `DataPendingCard` — fills a whole region that has no data yet
- `PositiveNegativeBar` — positive/negative split bar

## Empty files

`DashboardFilterDrawer.tsx` and `DashboardTitle.tsx` are zero bytes. They are
not components, and nothing imports them.

## Conventions

A specification states what a component is for, its contract, how it behaves,
and the principles behind it. It records decisions that are easy to reverse by
accident — why a banner is not dismissible, why a footnote is not a tooltip, why
a pending value has no numeric fallback.

It does not restate the implementation. When the two disagree, the component is
the truth and the specification is stale.
