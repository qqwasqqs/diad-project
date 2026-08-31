# Dashboard Drawer

## Overview

The Dashboard Drawer is the right-side panel that opens over a dimmed dashboard
when a reader selects a main-view element. It owns the drawer surface, its
header, and its close affordance; it does not know what any drawer contains.

This is the generic container. The composed drawer used by the persona
dashboards is [Detail Drawer](../detail-drawer/README.md), which builds its
standard anatomy on top of this component.

## Purpose

Use the Dashboard Drawer when a reader needs more about one element without
leaving the dashboard. The main view stays visible behind it, which is what
distinguishes a detail drawer from a page: the reader keeps their place, their
selected filters, and their sense of where the detail came from.

## Component contract

```tsx
<DashboardDrawer
  open={open}
  onClose={() => setOpen(false)}
  eyebrow="FAILURE LOCALIZATION DETAILS"
  title="Failure localization"
  description="Eight workload-specific rates, each with its own denominator"
  size="wide"
>
  {/* drawer content */}
</DashboardDrawer>
```

### Props

- `open`: whether the drawer is shown.
- `onClose`: called when the reader dismisses it, by the close control or by any
  dismissal the underlying drawer supports.
- `title`: the name of the element this drawer deepens.
- `eyebrow`: optional short uppercase label above the title, naming the detail
  view.
- `description`: optional single line under the title saying what the drawer
  covers.
- `size`: `default` (400px) or `wide` (720px).
- `children`: the drawer body.
- `footer`: optional footer content.
- `className` is not exposed; width is selected through `size` so drawers stay
  consistent across dashboards.

## Behavior

- Opens from the trailing edge over the dimmed main view.
- Renders a close control in the header, labelled for assistive technology.
- Renders eyebrow, title, and description as a single header block.
- Only the drawer whose `open` is true is mounted, so several drawers may be
  declared on one page without interfering.

## Design principles

- One drawer at a time. A page holds a single open-drawer state rather than one
  boolean per drawer, so two drawers cannot be open together.
- Width is a choice between two sizes rather than a free value. A drawer holding
  a chart and a provenance table needs `wide`; a short list does not. Allowing
  arbitrary widths would let drawers drift apart across dashboards.
- The drawer never becomes a page. It adds context to one element; it does not
  navigate, and it does not carry its own filters.

## Implementation example

```tsx
import { useState } from 'react';
import DashboardDrawer from '@/components/shared/dashboard/DashboardDrawer';

export default function Example() {
  const [open, setOpen] = useState(false);

  return (
    <DashboardDrawer
      open={open}
      onClose={() => setOpen(false)}
      title="Cost details"
    >
      <p>Detail content</p>
    </DashboardDrawer>
  );
}
```

## Component location

- Shared component: [components/shared/dashboard/DashboardDrawer.tsx](../../../components/shared/dashboard/DashboardDrawer.tsx)

## Out of scope

- The standard drawer anatomy — banner, provenance table, decisions, notes —
  which belongs to [Detail Drawer](../detail-drawer/README.md)
- Deciding which elements are selectable; that comes from a dashboard's approved
  clickability map
- Metric calculation, data fetching, and filter state
- Navigation, routing, and cross-persona links
