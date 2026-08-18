# Task: Implement the shared Line Chart component

## Description

Create a reusable React/Next.js JSX `LineChart` component. It renders one or
more independently identified line series and may render an optional Supporting
Stats group beneath the plot. It is a structural visualization component: it
does not calculate, aggregate, normalize, or interpret the supplied metric data.

### Series data contract

Pass line data through an ordered `series` prop. `series` is an array of series
objects, rather than an array of bare point arrays, because each line needs its
own identity, legend label, color, and axis assignment.

Each series object contains:

- `id` — stable identifier for the series.
- `label` — legend label for the series.
- `color` — approved visual color for the series.
- `yAxis` — identifier of the Y axis used by the series.
- `points` — an ordered array of point objects, each with `x` and `y` values.

```jsx
const series = [
  {
    id: "sessions",
    label: "Sessions",
    color: "blue",
    yAxis: "left",
    points: [
      { x: "Apr 20", y: 12000 },
      { x: "Apr 21", y: 15000 },
    ],
  },
  {
    id: "queries",
    label: "Queries",
    color: "violet",
    yAxis: "right",
    points: [
      { x: "Apr 20", y: 10000 },
      { x: "Apr 21", y: 16000 },
    ],
  },
];
```

The chart supports as many line-series objects as the caller supplies. The
series count is not itself a separate component variant. Axis labels, axis
configuration, chart title, and legend configuration must also be supplied as
explicit props or configuration; do not infer them from point values.

### Supporting Stats composition

`SupportingStats` is a separate shared child component for the optional,
repeated statistics shown beneath a line chart. Each stat has this compact
horizontal anatomy:

```text
[ icon ]  [ value ]  [ text ]
```

Pass its data through the Line Chart’s optional `supportingStats` prop. The
prop is an ordered array of objects with `id`, `icon`, `value`, and `text`.
When the prop is omitted or empty, the Line Chart does not render the
Supporting Stats area.

```jsx
const supportingStats = [
  {
    id: "queries-per-session",
    icon: <UsersIcon />,
    value: "4.6",
    text: "queries/session",
  },
  {
    id: "average-session",
    icon: <ClockIcon />,
    value: "8.2 min",
    text: "avg session",
  },
];

<LineChart
  title="Session & Query Volume"
  series={series}
  axes={axes}
  supportingStats={supportingStats}
/>
```

The Line Chart integrates the child component through composition:

```jsx
<ChartPlot series={series} axes={axes} />
{supportingStats?.length > 0 && <SupportingStats items={supportingStats} />}
```

`SupportingStats` owns its icon-value-text layout. `LineChart` only owns its
placement below the plot and the conditional rendering based on the optional
array prop. Do not use separate props for the first and second supporting
statistic, because they have the same repeated structure.

## Structural responsibilities

- Render an ordered set of line series from the `series` array.
- Render legend entries using each series label and color.
- Render the configured X and Y axes, including multiple Y axes when supplied.
- Render the optional Supporting Stats group below the plot.
- Preserve provided series and point order for predictable visual output.

## Out of scope

- Metric calculations, aggregation, scaling decisions, telemetry, data
  fetching, thresholds, business meaning, and API contracts.
- The internal icon-value-text layout of `SupportingStats`.
- Any fixed limit on the number of line series; readability review remains
  necessary when a caller supplies many series.

## Acceptance criteria

- A JSX consumer can render one, two, four, or more series through `series`.
- Every series accepts ordered `{ x, y }` point objects and has its own label,
  color, and Y-axis assignment.
- The chart can render configured single- or dual-Y-axis layouts.
- Supplying `supportingStats` renders a Supporting Stats group below the plot.
- Omitting or passing an empty `supportingStats` array renders no Supporting
  Stats area.
- The Line Chart does not calculate or interpret supplied values.
