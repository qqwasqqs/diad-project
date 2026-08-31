# Dashboard Grid

## Overview

The Dashboard Grid arranges a dashboard's panels. It owns the column tracks and
the gap between panels; it does not style the panels themselves or decide what
goes in them.

## Purpose

Use the Dashboard Grid as the container for a main view's panels. It provides
the two arrangements the approved designs need: equal halves, and a twelve-column
track for the unequal splits several designs specify — a full-width panel above a
60/40 row above a 65/35 row.

## Component contract

```tsx
<DashboardGrid columns={12}>
  <DashboardPanel className="xl:col-span-12" … />
  <DashboardPanel className="xl:col-span-7" … />
  <DashboardPanel className="xl:col-span-5" … />
</DashboardGrid>
```

### Props

- `columns`: `2` (default) for equal halves, or `12` for a twelve-column track.
- `children`: the panels.

With `columns={12}`, each child supplies its own `xl:col-span-*`, and the spans
in a row should sum to 12.

## Behavior

- A single column below the `xl` breakpoint, so panels stack on narrow screens.
- At `xl` and above, either two equal tracks or twelve tracks.
- A uniform gap between panels in both directions.

## Design principles

- The default stays two equal columns so existing dashboards are unaffected by
  the twelve-column option.
- Spans are expressed on the panels rather than configured centrally, so a row's
  proportions are visible where the panels are declared.
- The grid does not stack at arbitrary widths. A design's proportions hold from
  `xl` upward, which is where the approved layouts were drawn.

## Implementation example

```tsx
import DashboardGrid from '@/components/shared/dashboard/DashboardGrid';
import DashboardPanel from '@/components/shared/dashboard/DashboardPanel';

export default function Example() {
  return (
    <DashboardGrid columns={12}>
      <DashboardPanel template="single" title="Failure localization" className="xl:col-span-7">
        {/* … */}
      </DashboardPanel>
      <DashboardPanel template="single" title="Capacity and efficiency" className="xl:col-span-5">
        {/* … */}
      </DashboardPanel>
    </DashboardGrid>
  );
}
```

## Component location

- Shared component: [components/shared/dashboard/DashboardGrid.tsx](../../../components/shared/dashboard/DashboardGrid.tsx)

## Out of scope

- Panel surface, heading, regions, and dividers, which belong to
  [Dashboard Panel](../dashboard-panel/README.md)
- Page padding, header, and filters, which belong to the page shell
- Content, data, and metric meaning
