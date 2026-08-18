# Task: Implement the shared Status Callout component

## Description

Create a reusable React/Next.js JSX `StatusCallout` component for compact
icon-and-text summaries. It is intended to be placed inside another layout
component, such as a region of a segmented Panel. It does not own the outer
panel surface, region boundaries, or dividers.

The component has one fixed internal structure:

```text
[ icon ]  [ title
            primary content ]
```

Supply all three visible elements through props:

- `icon` — the leading visual icon.
- `title` — the short identifying label.
- `primaryContent` — the prominent content beneath the title. It may be a
  numeric value, status phrase, badge, or other short renderable result.

Do not use `children` as the component’s general content API. This component
has a known, compact anatomy, and explicit props preserve consistent rendering
across every use. It is not an unrestricted wrapper component.

### ReactNode approach

Use React renderable nodes (`ReactNode`) for `icon` and `primaryContent`.
`ReactNode` means content that React can render, including plain text, a number,
a JSX element, a fragment, or a conditionally rendered element. This keeps the
callout’s overall structure fixed while allowing the primary-content area to
render an appropriate short presentation.

For example, the primary content below is a JSX `<span>` element, which is a
ReactNode passed through the `primaryContent` prop:

```jsx
<StatusCallout
  icon={<SafetyEvaluatorIcon />}
  title="Safety Evaluators"
  primaryContent={
    <span className="status-callout__pending">Calculation pending</span>
  }
/>
```

The component should not assume that the primary content is a healthy status,
a calculated metric, or even available data. The caller supplies the rendered
content and its approved meaning.

## Structural responsibilities

- Render the icon beside a two-line content stack.
- Render title above primary content.
- Accept the three visible elements as explicit props.
- Keep the callout compact and compatible with placement in a segmented Panel
  or other parent layout.
- Ensure the text remains understandable without relying on icon or color
  alone.

## Out of scope

- Outer card/panel styling, dividers, segment sizing, and placement in the
  dashboard.
- Metric calculations, telemetry, data fetching, thresholds, status meaning,
  chart rendering, and arbitrary free-form child layout.

## Acceptance criteria

- A JSX consumer can pass an icon, title, and primary content through props.
- `primaryContent` accepts and renders plain text and a JSX ReactNode.
- The component renders the fixed icon-plus-title-and-primary-content anatomy.
- It can be used in any peer region of a segmented Panel without owning that
  panel’s structure.
- No metric- or data-specific behavior is built into the component.
