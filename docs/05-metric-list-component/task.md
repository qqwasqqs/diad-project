# Task: Implement the shared Metric List component

## Description

Create a reusable React/Next.js JSX `MetricList` component. It renders an
ordered group of compact Metric List Rows. It is a structural display component:
it does not calculate values, define metric meaning, or fetch data.

Each row has this fixed anatomy:

```text
[ optional icon ]  [ label ]                          [ value ]
```

Supply the rows through an ordered `items` prop. Every item has these fields:

- `id` — a stable, nonvisual identifier used as the React list key.
- `icon` — an optional ReactNode displayed before the label.
- `label` — the row’s identifying text.
- `value` — a ReactNode displayed at the end of the row.

The caller supplies the approved label and value content. The Metric List must
not calculate, interpret, or infer the value’s business meaning or state.

```jsx
const items = [
  {
    id: "request-throughput",
    icon: <ThroughputIcon />,
    label: "Request Throughput",
    value: "42.8 req/s",
  },
  {
    id: "token-throughput",
    label: "Token Throughput",
    value: "Definition pending",
  },
];

<MetricList items={items} />;
```

`icon` is optional. When it is omitted, the row must retain the same label and
end-aligned value structure without rendering an empty icon placeholder.

`value` is a ReactNode so it can render a normal value, a status phrase, or an
approved short JSX treatment. Do not use free-form `children` as the list API:
the repeated row anatomy is known and should be controlled by the component.

The Metric List does not own a section title. A title shown above a list belongs
to the enclosing Panel and uses that component’s whole-panel or section-title
arrangement.

## Structural responsibilities

- Render ordered rows from the `items` array.
- Render an optional icon, label, and end-aligned value in every row.
- Render consistent row spacing and separators between rows when required by
  the selected visual treatment.
- Preserve the provided item order for visual scanning and assistive
  technology.
- Render a no-icon row without changing the list’s basic structure.

## Out of scope

- Panel surfaces, borders, dividers between Panel regions, and section titles.
- Metric calculations, telemetry, data fetching, thresholds, status meaning,
  and API contracts.
- Arbitrary free-form row layouts passed as `children`.

## Acceptance criteria

- A JSX consumer can pass an ordered `items` array with `id`, optional `icon`,
  `label`, and `value` fields.
- Rows render in the supplied order with label and end-aligned value.
- Rows render correctly when `icon` is present or omitted.
- `value` accepts text and JSX ReactNode content.
- The component does not calculate or interpret the supplied metric values.
