# Detail Drawer

## Overview

The Detail Drawer is the composed drawer used by the persona dashboards. It
renders the anatomy every approved detail view shares — header, illustrative
values banner, element-specific content, provenance table, decisions register,
and qualifying notes — leaving only the middle section to the caller.

It builds on [Dashboard Drawer](../dashboard-drawer/README.md), which owns the
surface and header.

## Purpose

Use the Detail Drawer for any drawer named in a dashboard's approved clickability
map. The approved drawers across the Executive, Product Owner, Operations, and
Technical Teams designs all describe the same structure: a chart, list, or set of
cards for the selected element, then a table making its calculation and scale
explicit, then the states that are still pending.

Encoding that shape once keeps provenance attached to the values it describes,
so the two cannot drift apart as drawers are added.

## Component contract

```tsx
<DetailDrawer
  open={openDrawer === 'failureLocalization'}
  onClose={closeDrawer}
  content={drawers?.failureLocalization}
  size="wide"
>
  <HorizontalBarList values={items} rowsPerColumn={4} max={2} />
</DetailDrawer>
```

### Props

- `open`: whether this drawer is the open one.
- `onClose`: called when the reader dismisses it.
- `content`: a `DrawerContent` from the dashboard payload, supplying the header
  text, provenance rows, decisions, and notes. The drawer renders nothing when
  it is absent.
- `size`: passed through to Dashboard Drawer.
- `children`: the element-specific content.

`DrawerContent` and its `ContextRow` are defined in
[types/dashboard.ts](../../../types/dashboard.ts).

## Behavior

Renders, in order:

1. the illustrative-values banner;
2. the caller's element-specific content;
3. a **Metric calculation** table, when the content has provenance rows;
4. a **Decisions required** register, when the content has decisions;
5. the notes, as footnotes.

Sections with no content are omitted rather than rendered empty. The provenance
table's columns follow its rows: a drawer that draws no scale distinction gets no
Scale column.

Every filter-coverage cell and every decision renders through
[Pending State Value](../pending-state-value/README.md), so an unattributable
scope reads as `FILTER BREAKDOWN UNAVAILABLE` and never as a value.

## Design principles

- The drawer deepens exactly one main-view element and never merges two, even
  when they share a panel. In the Technical Teams view the latency chart and the
  diagnostics list sit in one panel and have separate drawers.
- Content is data, not markup. The header text, provenance, decisions, and notes
  arrive in the payload alongside the values they describe, so a drawer cannot
  claim a calculation the data does not support.
- The drawer adds provenance and readiness context. It is not an incident view,
  a root-cause analysis, or a place for raw errors, identifiers, prompts,
  responses, or sensitive values.

## Implementation example

```tsx
import DetailDrawer from '@/components/shared/dashboard/DetailDrawer';
import MetricList from '@/components/shared/dashboard/MetricList';

export default function ReadinessDrawer({ open, onClose, content, rows }) {
  return (
    <DetailDrawer open={open} onClose={onClose} content={content} size="wide">
      <MetricList variant="prominent" items={rows} />
    </DetailDrawer>
  );
}
```

The Technical Teams dashboard composes all six of its drawers this way; see
[app/home/tech-team-dashboard/page.tsx](../../../app/home/tech-team-dashboard/page.tsx).

## Component location

- Shared component: [components/shared/dashboard/DetailDrawer.tsx](../../../components/shared/dashboard/DetailDrawer.tsx)

## Out of scope

- The drawer surface, header, and close control, which belong to
  [Dashboard Drawer](../dashboard-drawer/README.md)
- Element-specific content, which the caller supplies
- Metric calculation, aggregation, and data fetching
- Deciding which states are pending; the payload supplies them
