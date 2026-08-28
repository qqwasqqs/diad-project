# Cost by Business Unit Chart

## Summary

This PR adds a reusable Cost by Business Unit Chart component for dashboard pages that need to compare total cost by business unit while highlighting the leading project beneath each unit. The component is built using Recharts, wrapped in the shared dashboard panel pattern, and is demonstrated in the Product Owner dashboard with local mock data.

## What changed

- Added a reusable `CostByBusinessUnitChart` component in the chart layer
- Implemented a vertical bar layout where each business unit displays:
  - a primary darker green bar for the total business unit cost
  - a lighter green project bar beneath it for the top project contribution
- Added project-name labeling directly on the project bar for clearer context
- Kept business unit and project references on the right side of the chart to match the dashboard design direction
- Removed the duplicate internal chart title and chart grid to reduce visual noise
- Added a compact infrastructure status card on the right side for the pending cost state
- Integrated the chart into the Product Owner dashboard mock example using dummy data

## Why this change

This view is meant to make cost concentration easier to understand at a glance. Instead of showing a single bar per business unit, the chart presents the top project directly under each unit so the dashboard consumer can quickly compare both total spend and the main driver behind that spend.

The design also keeps the chart aligned with the wider dashboard system:

- it remains wrapped by the shared `DashboardPanel` container
- it uses lightweight mock data for local UI review
- it follows the dashboard visual standards for compact labeling, clear hierarchy, and minimal chart clutter

## Example usage

The Product Owner dashboard demonstrates how this component is used in context:

```tsx
import DashboardPanel from '@/components/shared/dashboard/DashboardPanel';
import CostByBusinessUnitChart from '@/components/charts/CostByBusinessUnitChart';

export default function ProductOwnerDashboard() {
  return (
    <DashboardPanel template="single" title="Cost by BU and Project">
      <CostByBusinessUnitChart
        data={[
          {
            name: 'Business Unit A',
            totalCost: 7.68,
            topProjectName: 'Project A1',
            topProjectCost: 4.21,
            color: '#1f7a5f',
          },
          {
            name: 'Business Unit B',
            totalCost: 5.42,
            topProjectName: 'Project B1',
            topProjectCost: 2.93,
            color: '#1f7a5f',
          },
          {
            name: 'Business Unit C',
            totalCost: 3.76,
            topProjectName: 'Project C1',
            topProjectCost: 1.94,
            color: '#1f7a5f',
          },
        ]}
      />
    </DashboardPanel>
  );
}
```

This example is intentionally using local dummy data while the dashboard is in front-end review mode, allowing the visual and layout treatment to be validated before introducing any backend dependencies.
