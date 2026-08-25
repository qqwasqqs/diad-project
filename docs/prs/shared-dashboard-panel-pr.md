# Shared dashboard panel component

## Summary

This PR adds a reusable dashboard shell component for single-region and segmented layouts. The panel owns the outer container, optional titles, and region splitting logic, while leaving each content area fully flexible for the consuming dashboard widget.

## What changed

- Added a generic DashboardPanel component in the shared dashboard folder
- Supported both single-region and segmented panel templates
- Added optional whole-panel or per-section titles
- Added region dividers only between peer sections
- Added a product owner dashboard test harness to validate both panel patterns
- Included a guard to warn when the number of child elements does not match the number of sections entries

## Why this change

The dashboard needs a lightweight structural wrapper that can be reused across multiple views without tying the component to specific metrics, charts, or business logic. This keeps the shared panel generic while preserving the dashboard visual family.

## Example usage

```tsx
import DashboardPanel from '@/components/shared/dashboard/DashboardPanel';

export default function Example() {
  return (
    <DashboardPanel
      template="segmented"
      sections={[
        { id: 'overview', title: 'Overview' },
        { id: 'details', title: 'Details' },
      ]}
    >
      <div>Primary content</div>
      <div>Secondary content</div>
    </DashboardPanel>
  );
}
```
