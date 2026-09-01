# Dashboard Header

## Overview

The Dashboard Header is the top block of a persona dashboard: its title,
subtitle, the global filter bar, and the export action. It is rendered by the
page shell, so a dashboard page does not place it directly.

## Purpose

Use the Dashboard Header through `DashboardPage`. Every approved persona design
opens with the same header and the same controls in the same order — period,
business unit, project, channel, then Export — so the arrangement is fixed here
rather than repeated per dashboard.

## Component contract

```tsx
<DashboardHeader
  title="AI Observability — Technical Teams Dashboard"
  description="Diagnose request paths, failures, evaluator quality, and capacity"
  showFilters
  showExport
/>
```

### Props

- `title`: the dashboard name.
- `description`: optional subtitle.
- `showFilters`: render the global filter bar. Defaults to true.
- `showExport`: render the export action. Defaults to true.

## Behavior

- Title and controls share one row where there is room for both, and the header
  stacks below that, giving the controls a row of their own.
- Export is rendered as the trailing item of the filter bar's own wrapping row,
  so it stays after the filters wherever the row breaks.
- Filter selections are held in
  [store/dashboardFiltersStore](../../../store/dashboardFiltersStore.ts), not in
  the header.

## Design principles

- The controls wrap as one group. Rendering Export outside the filters' wrapping
  container leaves it stranded mid-row at narrow widths, with filters continuing
  underneath it.
- The header stacks rather than compressing. Title and controls have a combined
  minimum width; below it, squeezing both into one row cramps the filters instead
  of failing cleanly.
- The header does not own filter state. It shows the selection and writes
  changes to the shared store, which lets a page read the same scope its header
  displays without prop-threading through the layout.

## Selection state

Holding a selection is not the same as applying it. A dashboard page opts in by
reading the store and passing the scope to its data hook; a page that does not
read the store is unaffected by the filter bar.

## Implementation example

Pages use it through the shell:

```tsx
import DashboardPage from '@/components/shared/dashboard/DashboardPage';

export default function Example() {
  return (
    <DashboardPage
      title="AI Observability — Technical Teams Dashboard"
      description="Diagnose request paths, failures, evaluator quality, and capacity"
    >
      {/* panels */}
    </DashboardPage>
  );
}
```

## Component location

- Shared component: [components/shared/dashboard/DashboardHeader.tsx](../../../components/shared/dashboard/DashboardHeader.tsx)
- Filter bar: [components/shared/dashboard/DashboardFilters.tsx](../../../components/shared/dashboard/DashboardFilters.tsx)
- Selection state: [store/dashboardFiltersStore.ts](../../../store/dashboardFiltersStore.ts)

## Out of scope

- Applying a filter to any value; that is a page and route responsibility
- The illustrative-values banner, which belongs to
  [Illustrative Values Banner](../illustrative-values-banner/README.md)
- Export behaviour and file generation
- Navigation and the application sidebar
