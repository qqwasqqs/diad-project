# Shared dashboard line chart component

## Summary

This PR adds a reusable shared line chart component for dashboard views that need to visualize ordered time-series data. The component remains intentionally presentational: it renders configured series, axes, legend entries, and optional supporting stats without calculating or interpreting the source metrics.

## What changed

- Added a reusable `DashboardLineChart` component in the shared dashboard folder
- Added a reusable `DashboardSupportingStats` child component for the optional icon/value/text summary rows beneath the chart
- Supported ordered series data with per-series `id`, `label`, `color`, `yAxis`, and `points`
- Supported single- and dual-axis layouts using explicit axis configuration
- Rendered legend entries from the supplied series data to preserve series identity and color mapping
- Rendered optional supporting stats beneath the plot only when a populated list is supplied
- Added a product owner dashboard mock example that demonstrates the chart in context and verifies the panel + chart composition pattern
- Tightened styling to better match the dashboard design reference, including title size, legend spacing, axis treatment, and supporting stat proportions

## Why this change

The dashboard needs a reusable, generic line-chart primitive that can be embedded across multiple pages without coupling itself to business rules or specific metric logic. This keeps the chart presentation-focused while ensuring each series remains independently configurable and visually distinct.

## Example usage

```tsx
import DashboardLineChart from '@/components/shared/dashboard/DashboardLineChart';

const series = [
  {
    id: 'sessions',
    label: 'Sessions',
    color: '#3b82f6',
    yAxis: 'left',
    points: [
      { x: 'Apr 20', y: 15000 },
      { x: 'Apr 21', y: 18000 },
    ],
  },
  {
    id: 'queries',
    label: 'Queries',
    color: '#8b5cf6',
    yAxis: 'right',
    points: [
      { x: 'Apr 20', y: 12000 },
      { x: 'Apr 21', y: 21000 },
    ],
  },
];

export default function Example() {
  return (
    <DashboardLineChart
      title="Session & Query Volume"
      description="Session Length / Query per session"
      series={series}
      axes={[
        { id: 'left', tickFormatter: (value) => `${Math.round(value / 1000)}K` },
        { id: 'right', tickFormatter: (value) => `${Math.round(value / 1000)}K` },
      ]}
      supportingStats={[
        { id: 'queries-per-session', value: '4.6', text: 'queries/session' },
        { id: 'avg-session', value: '8.2 min', text: 'avg session' },
      ]}
    />
  );
}
```
