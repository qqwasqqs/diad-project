# Dashboard Section Action

## Overview

The Dashboard Section Action is the control that opens a section's detail
drawer. It is a small subtle button carrying an overflow icon, placed beside a
panel or region heading.

## Purpose

Use it on every main-view element that an approved clickability map marks as
selectable. It gives that element one explicit, labelled control instead of
making the surrounding panel a click target.

## Component contract

```tsx
<DashboardSectionAction
  onClick={() => setOpenDrawer('failureLocalization')}
  label="View failure localization details"
/>
```

### Props

- `onClick`: opens the element's drawer.
- `label`: accessible label. Defaults to `View details`.

## Behavior

- Renders as a subtle, small, icon-only button.
- Exposes `label` as its accessible name; the icon carries no text.

## Design principles

- **Give each instance its own label.** The default exists for single-action
  pages. A dashboard with six selectable elements and six controls all reading
  "View details" is ambiguous to anyone navigating by control name; name the
  element instead.
- **An explicit control rather than a clickable panel.** Approved clickability
  maps describe "clicking the panel", but a panel contains its own interactive
  elements — dropdowns, links, chart tooltips — and nesting those inside a click
  target is both ambiguous and poor accessibility. A dedicated control keeps the
  target unambiguous.
- **The action belongs to the element, not the panel.** A panel holding two
  separately selectable elements gets one control per element, through
  `DashboardPanel`'s per-section `action`.

## Implementation example

```tsx
import DashboardPanel from '@/components/shared/dashboard/DashboardPanel';
import DashboardSectionAction from '@/components/shared/dashboard/DashboardSectionAction';

export default function Example({ setOpenDrawer }) {
  return (
    <DashboardPanel
      template="single"
      title="Capacity and efficiency"
      actions={
        <DashboardSectionAction
          onClick={() => setOpenDrawer('capacityAndEfficiency')}
          label="View capacity and efficiency details"
        />
      }
    >
      {/* … */}
    </DashboardPanel>
  );
}
```

## Component location

- Shared component: [components/shared/dashboard/DashboardSectionAction.tsx](../../../components/shared/dashboard/DashboardSectionAction.tsx)

## Out of scope

- The drawer it opens, which belongs to
  [Detail Drawer](../detail-drawer/README.md)
- Open/close state, which the page holds
- Deciding which elements are selectable; that comes from the approved
  clickability map
