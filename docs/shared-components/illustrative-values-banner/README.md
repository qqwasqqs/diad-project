# Illustrative Values Banner

## Overview

The Illustrative Values Banner is a full-width notice placed directly beneath a
dashboard header. It states that the values shown on the page are illustrative
and that targets and thresholds have not been validated.

This component handles one fixed responsibility: rendering a standing page-level
notice. It does not manage the header, the filters, or any dashboard content
below it.

## Purpose

Use the Illustrative Values Banner on any dashboard whose displayed values are
design placeholders rather than validated telemetry. The dashboard documentation
requires that illustrative values are labelled as such, so a reader never mistakes
a mockup figure for a measured one.

The banner is a property of the page's data state, not a reaction to a user
action. It is present for as long as the page's values remain unvalidated.

## Component contract

```tsx
<IllustrativeValuesBanner />
```

### Props

- `message`: optional replacement for the default notice text.
- `icon`: optional replacement for the leading icon.
- `className`: optional styling hook for additional layout adjustments.

The default message is:

```text
ILLUSTRATIVE VALUES — TARGETS AND THRESHOLDS PENDING VALIDATION
```

Callers that display validated data should omit the banner entirely rather than
pass a softened message.

## Behavior

- Spans the full width of the dashboard content column.
- Renders a leading warning icon followed by uppercase notice text.
- Uses the warning background and warning content color tokens.
- Is not dismissible. There is no close control and no persisted dismissal state.
- Is not announced as an alert. It describes a standing condition of the page, so
  it does not interrupt assistive technology on load.

## Design principles

- The banner is deliberately not a toast, alert, or dialog. Those patterns
  communicate events that a user acknowledges and clears. This communicates a
  property of the data that the user cannot resolve, so allowing dismissal would
  let a reader remove the one signal that keeps the figures honest.
- Text carries the meaning; the amber treatment reinforces it. The notice reads
  correctly with color removed.
- The banner sits above all content it qualifies, and inside the same width
  constraint, so its scope is visually unambiguous.
- The wording states a present-tense fact. It does not promise validation, name
  an owner, or give a date.

## Visual reference

The banner appears directly below the header in the approved Technical Teams main
view, above the first panel.

![Technical Teams main view](../../tech-team-dashboard/tech-team-dashboard-alternative-02.png)

## Implementation example

```tsx
import DashboardPage from '@/components/shared/dashboard/DashboardPage';
import IllustrativeValuesBanner from '@/components/shared/dashboard/IllustrativeValuesBanner';

export default function TechTeamDashboard() {
  return (
    <DashboardPage
      title="AI Observability — Technical Teams Dashboard"
      description="Diagnose request paths, failures, evaluator quality, and capacity"
    >
      <IllustrativeValuesBanner />
      {/* dashboard panels */}
    </DashboardPage>
  );
}
```

## Component location

- Planned shared component:
  `components/shared/dashboard/IllustrativeValuesBanner.tsx`

## Out of scope

- Header, title, subtitle, and global filter rendering
- Per-metric pending states, which belong to `PendingStateValue`
- Dismissal, snoozing, and persistence
- Event or error notification, which belongs to the toast system
- Deciding whether a page's values are illustrative; the caller supplies that
