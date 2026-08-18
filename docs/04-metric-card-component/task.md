# Task: Implement the shared Metric Card component

## Description

Create a reusable React/Next.js JSX `MetricCard` component for compact metric
summaries. It owns its card surface and fixed visual hierarchy, but it does not
calculate values, define metric meaning, or fetch data.

Every Metric Card has this fixed anatomy:

```text
icon + title
primary content
optional supporting content
```

Supply the fixed elements as explicit props:

- `icon` — the icon displayed with the title.
- `title` — the identifying card label.
- `primaryContent` — the prominent value, formula, phrase, or other primary
  renderable result.
- `supportingContent` — an optional ReactNode rendered below primary content.

Do not use general `children` as the main content API. The card has a known
anatomy, so named props preserve a consistent hierarchy and placement.

### Optional supporting-content variants

The three approved variants are one component with an optional
`supportingContent` slot:

1. No supporting content: icon, title, and primary content only.
2. Supporting text: a smaller text node below primary content.
3. Supporting visualization: a separate child visualization component below
   primary content.

`supportingContent` is a ReactNode, meaning React-renderable content such as
text or a JSX element. This allows the card to preserve its fixed structure
without incorporating unrelated chart or list logic.

```jsx
<MetricCard
  icon={<FeedbackIcon />}
  title="User Feedback"
  primaryContent={<>84% positive</>}
  supportingContent={<PositiveNegativeBar positive={84} negative={16} />}
/>
```

The `PositiveNegativeBar` in this example is a separate child component. The
Metric Card only provides its placement beneath primary content; it must not
own the bar’s structure, data interpretation, or calculations.

## Structural responsibilities

- Render the card surface, padding, icon-and-title area, and fixed vertical
  information hierarchy.
- Render explicit `icon`, `title`, and `primaryContent` props.
- Render `supportingContent` only when it is supplied.
- Keep the optional supporting slot in the same position for supporting text
  and supporting visualization variants.
- Keep text understandable without relying solely on icon or color.

## Out of scope

- Metric formulas, values, telemetry, data fetching, thresholds, status
  meaning, and API contracts.
- The internal layout, calculation, or rendering logic of a chart, bar, list,
  or any other component passed through `supportingContent`.
- An unrestricted free-form `children` layout.

## Acceptance criteria

- A JSX consumer can pass icon, title, and primary content as explicit props.
- A JSX consumer can omit `supportingContent` for the basic card variant.
- `supportingContent` can render text or a JSX ReactNode child component.
- Supporting content always renders below primary content.
- The Metric Card does not calculate or interpret its supplied content.
