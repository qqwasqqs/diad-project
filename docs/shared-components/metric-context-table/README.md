# Metric Context Table

## Overview

The Metric Context Table presents metric provenance: how a value is calculated,
on what scale, and whether the selected filter scope can be honoured. It is a
structural display component — it derives nothing and knows nothing about what
any calculation means.

## Purpose

Use it wherever a reader needs to know where a number came from before acting on
it. In practice that is inside a detail drawer, where the approved designs call
it a calculation-context or provenance table.

It exists so the same four questions — which metric, calculated how, on which
scale, covered for which scope — are answered the same way in every drawer.

## Component contract

```tsx
<MetricContextTable
  columns={[
    { id: 'metric', header: 'Metric' },
    { id: 'calculation', header: 'Calculation' },
    { id: 'coverage', header: 'Filter coverage' },
  ]}
  rows={[
    {
      id: 'end-to-end-p95',
      cells: {
        metric: 'End-to-End P95',
        calculation: 'P95',
        coverage: <PendingStateValue state="filter-breakdown" />,
      },
    },
  ]}
  caption="Request-path latency calculation context"
/>
```

### Props

- `columns`: ordered column definitions, each with an `id` and a `header`.
- `rows`: ordered rows. Each has an `id` for the React key and a `cells` object
  keyed by column id. A cell may be a string or a rendered node.
- `caption`: optional description announced to assistive technology.
- `className`: optional styling hook.

A cell with no entry for a column renders empty rather than failing.

## Behavior

- Renders a header row and one row per entry, using semantic table markup with
  column scopes.
- Scrolls horizontally within its own bounds when the content is wider than the
  space, so a wide table never forces its container to scroll.
- The caption is available to assistive technology and not shown visually.

## Design principles

- **The caller owns every cell.** The component neither formats values nor
  decides coverage. A coverage cell is normally a
  [Pending State Value](../pending-state-value/README.md), which keeps an
  unattributable scope reading as `FILTER BREAKDOWN UNAVAILABLE` rather than as
  a value.
- **Columns are supplied, not fixed.** Drawers differ in whether they
  distinguish scales or show latest values; a fixed column set would leave empty
  columns in the drawers that do not.
- **Provenance sits with the values it describes.** The table belongs beside the
  metric in its drawer, not in separate documentation, so the two cannot drift
  apart.

## Implementation example

Composed automatically by [Detail Drawer](../detail-drawer/README.md) from a
drawer's `contextRows`, which is how the persona dashboards use it. Use it
directly only for a table outside that anatomy.

## Component location

- Shared component: [components/shared/dashboard/MetricContextTable.tsx](../../../components/shared/dashboard/MetricContextTable.tsx)

## Out of scope

- Metric calculation, aggregation, and data fetching
- Deciding a metric's filter coverage; the payload supplies it
- Sorting, filtering, pagination, and row selection
- Thresholds, targets, and favorable or unfavorable interpretation
