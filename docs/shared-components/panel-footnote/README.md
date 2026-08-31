# Panel Footnote

## Overview

The Panel Footnote is a small, always-visible note rendered beneath a panel's
content. It carries a short qualification that a reader needs in order to
interpret what the panel shows.

This component handles one fixed responsibility: rendering a short note with an
optional leading icon. It does not own the panel surface, its heading, or its
content regions.

## Purpose

Use the Panel Footnote where a panel's content is open to a specific and
documented misreading. The approved Technical Teams main view requires one on the
request-path latency chart, whose four series must not be read as a decomposition
of end-to-end latency:

```text
Component times are not additive
```

The note is part of the panel's meaning, not supplementary help. A reader who
misses it can draw a wrong conclusion from a correct chart.

## Component contract

```tsx
<PanelFootnote>Component times are not additive</PanelFootnote>
```

### Props

- `children`: the note text or renderable content.
- `icon`: optional leading icon. Defaults to an informational icon.
- `className`: optional styling hook for additional layout adjustments.

Unlike the compact metric components, this component uses `children` as its
content API. The note is free-form prose of variable length rather than a fixed
anatomy of named parts, so a single content slot is the honest contract.

## Behavior

- Renders beneath the panel content it qualifies, inside the panel's padding.
- Renders a leading icon followed by the note text.
- Uses a smaller type size than the panel body and a muted text treatment, while
  remaining fully legible.
- Is always visible. The note is not collapsed, truncated, or hidden behind a
  hover or focus interaction.

## Design principles

- The footnote is deliberately not a tooltip, popover, or info-icon affordance.
  Those hide their content until a user seeks it out, which is the wrong pattern
  for a qualification the reader needs in order to read the panel correctly at a
  glance.
- Muted styling lowers the note's prominence relative to the data without
  reducing its legibility. It is quiet, not hidden.
- The note qualifies one panel and lives inside that panel's boundary, so its
  scope is unambiguous.
- The component holds no domain knowledge. It does not know which panels need a
  note or what any note should say.

## Relationship to neighbouring components

- `IllustrativeValuesBanner` states a condition that applies to an entire page and
  sits above all content.
- Panel Footnote states a qualification that applies to one panel and sits within
  it.

## Visual reference

The note appears beneath the latency chart in the `Request-path health` panel of
the approved Technical Teams main view.

![Technical Teams main view](../../tech-team-dashboard/tech-team-dashboard-alternative-02.png)

## Implementation example

```tsx
import DashboardPanel from '@/components/shared/dashboard/DashboardPanel';
import DashboardLineChart from '@/components/shared/dashboard/DashboardLineChart';
import PanelFootnote from '@/components/shared/dashboard/PanelFootnote';

export default function RequestPathHealth({ series }) {
  return (
    <DashboardPanel template="single" title="Request-path health">
      <DashboardLineChart
        series={series}
        axes={[{ id: 'left', label: 'Latency (ms)' }]}
      />
      <PanelFootnote>Component times are not additive</PanelFootnote>
    </DashboardPanel>
  );
}
```

## Component location

- Planned shared component:
  `components/shared/dashboard/PanelFootnote.tsx`

## Out of scope

- Panel surface, heading, region, and divider behavior
- Page-level notices, which belong to `IllustrativeValuesBanner`
- Per-metric pending states, which belong to `PendingStateValue`
- Tooltip, popover, and disclosure interactions
- Deciding which panels require a note, and authoring its wording
