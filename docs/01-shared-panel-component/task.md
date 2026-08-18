# Task: Implement the generic shared Panel component

## Description

Create a reusable React/Next.js JSX `Panel` component for dashboard layout.
This is a structural wrapping component. It owns the outer panel surface and
the arrangement of its regions; it does not define the internal structure,
content, icons, labels, values, charts, lists, or states of the components it
wraps.

The component must support these templates through props:

1. **Single-region panel** — one unsplit region containing one child component
   or one composed child layout.
2. **Segmented panel** — two or more peer regions, separated by internal
   dividers. No region is structurally primary or supporting. The same template
   must support a two-region split and a multi-region split.

The segmented template must be driven by an ordered `sections` array. Each
section supplies a stable `id` and may supply a `title`. The section count
determines the number and order of panel regions; the implementation must not
hard-code a two-, three-, or four-region layout.

The panel must support either of these heading arrangements:

- A single `title` for the whole panel; or
- A title for each section, supplied through the `sections` array.

These are alternative structural heading modes. The initial component should
not assume that a panel title and section titles are shown together unless a
later design decision explicitly requires that combination.

The panel is a wrapping component. Content is supplied as React `children`:

- In the single-region template, render the supplied child in the one region.
- In the segmented template, render ordered children into the matching ordered
  sections. Validate or guard against a mismatch between the number of sections
  and the number of child elements.

Suggested JSX-facing contract (names may be refined during implementation):

```jsx
<Panel
  template="single" | "segmented"
  title="Optional panel title"
  sections={[{ id: "first", title: "Optional section title" }]}
>
  {children}
</Panel>
```

## Structural responsibilities

- Render the outer panel boundary, padding, and optional heading area.
- Render the requested one-region or segmented layout from props.
- Render dividers only between segmented regions.
- Keep regions equal in structural status; child components determine their own
  internal layout and visual hierarchy.
- Preserve the established dashboard visual family when styles are added.

## Out of scope

- Metric calculations, API data, telemetry, chart configuration, list-row
  layout, icon placement, text/value alignment, pending-state internals, and
  responsive behavior below the approved normal-laptop design scope.
- Domain-specific variants such as a chart-and-list panel or a bottom bar.
  A panel placed at the bottom of a view is still the same generic segmented
  panel.

## Acceptance criteria

- A JSX component can render a single child in an unsplit panel.
- A JSX component can render any number of peer child regions from a sections
  array, including two and four regions.
- Whole-panel and per-section title modes are both supported.
- The component accepts arbitrary child components without prescribing their
  internals.
- No business-data or metric-specific behavior is added to the component.
