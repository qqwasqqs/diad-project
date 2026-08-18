# Task: Implement the shared Horizontal Bar List component

## Description

Create a reusable React/Next.js JSX `HorizontalBarList` component. It displays
an ordered group of compact horizontal-bar rows. It is a structural display
component: it does not calculate values, define metric meaning, or fetch data.

Each row has one fixed anatomy:

```text
[ label ]  [ horizontal bar                          ]  [ displayed value ]
```

Do not include icons in this component or its rows.

Supply the ordered rows through a `values` prop. `values` is an array of
objects, and every object has exactly these component-facing fields:

- `label` — the text shown at the start of the row.
- `value` — the supplied value used to render the horizontal bar and shown at
  the end of the row.

For example:

```jsx
const channelMixValues = [
  { label: "Web", value: 52 },
  { label: "Teams", value: 28 },
  { label: "Mobile", value: 14 },
  { label: "API", value: 6 },
];

<HorizontalBarList values={channelMixValues} />;
```

The caller provides the approved values. The component uses each supplied
`value` for visual presentation only; it must not calculate, normalize, or
interpret business data.

### Layout behavior

The component has a fixed design height. Its rows use a consistent row height,
which establishes how many rows fit in one column.

- Render one column when all rows fit within that height.
- When more rows are supplied, use CSS Grid to flow the remaining ordered rows
  into a second column.
- Fill the first column from top to bottom before continuing at the top of the
  second column. The visual reading order and DOM order must match.
- Render no more than two columns. Do not create a third, narrower column.

The component should use CSS Grid, not CSS floats. The selected grid layout
must preserve readable label, bar, and value areas in both the one- and
two-column states.

The initial usage contract is that a supplied item count fits in at most two
columns. If later requirements exceed that capacity, define and approve an
explicit overflow behavior before implementing it; do not silently clip,
shrink, or add columns.

The component may be placed inside a shared Panel. The Panel owns the outer
surface, border, title placement, and panel regions; `HorizontalBarList` owns
only its ordered horizontal-bar rows and their one- or two-column arrangement.

## Structural responsibilities

- Render each item as label, horizontal bar, and displayed value.
- Maintain a fixed component height and consistent row geometry.
- Flow ordered rows from one column into at most two grid columns.
- Preserve the item order for both visual scanning and assistive technology.
- Render arbitrary approved labels and values without assigning business
  meaning to them.

## Out of scope

- Icons, warning states, metric calculations, bar normalization, telemetry,
  API data, thresholds, and data fetching.
- Third-or-greater column layouts and unapproved overflow behavior.
- Outer Panel styling, dividers, panel-level title placement, and dashboard
  placement.

## Acceptance criteria

- A JSX consumer can supply an ordered `values` array of `{ label, value }`
  objects to render bar rows.
- Each rendered row contains a label, bar, and displayed value, with no icon.
- A short list renders as one column within the fixed component height.
- A longer supported list flows top-to-bottom into a second grid column.
- The component never renders more than two columns.
- No calculation or data-specific behavior is built into the component.
