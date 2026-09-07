# Executive dashboard drawer header implementation plan

Status: shared front-end implementation complete. Executive drawer-host rollout
remains pending because the current executive page has no drawer hosts or
opening actions.

## Objective

Reuse `DashboardHeader` with two prop-selected templates: the existing main
header and a smaller drawer header. Every executive detail drawer should show
interactive period, business-unit, project, and channel filters below its title
block, before its content. Use dummy options and local selections; changing
filters does not fetch or recalculate data.

The supplied Product Owner experience drawer is a structural reference. The
executive development documents provide design context, not authorization to
execute their broader implementation tasks.

## Verified starting point

- `DashboardHeader.tsx` renders a page-level title, description, filters, and
  Export; it has no template prop.
- `DashboardFilters.tsx` reads and writes the global Zustand store directly.
  Static option lists already exist in `store/dashboardFiltersStore.ts`.
- `DashboardFilter.tsx` uses 32px-high triggers with a 140px minimum width.
- `DashboardDrawer.tsx` owns the Fluent UI title, close action, body, and footer.
  Default/wide drawers are 400px/720px. `DetailDrawer.tsx` wraps this shell.
  The supplied Product Owner drawer uses the shell directly.
- `app/home/executive-dashboard/page.tsx` has sample panels and cards but no
  drawers or opening actions. The executive development document describes four
  future detail views: Executive pulse, Session and query details, Cost by BU
  and Project, and Safety and risk posture.
- No `PROJECT_INSTRUCTIONS.md`, `PROJECT_INDEX.md`, or `AGENTS.md` was found
  in the project tree during review. Preserve existing unrelated local changes.

## Implementation sequence

### 1. Add two explicit header templates

Add `template?: "main" | "drawer"`, defaulting to `"main"`.
Keep existing `DashboardPage` callers compatible.

| Template | Layout | Filters | Export |
| --- | --- | --- | --- |
| main | Existing title/description and responsive controls arrangement | Existing size | Existing default |
| drawer | Compact title block, then left-aligned filter row at all widths | Compact | Default off |

Allow the drawer template to receive its eyebrow, description as `ReactNode`,
and close action. Compose the existing Fluent UI `DrawerHeaderTitle` in this
branch so the drawer retains one accessible title. Render filters as a sibling
below the title block, not inside its heading. Do not add another page-level
`h1` or repeat the existing drawer title.

The outer `DrawerHeader`, drawer lifecycle, body, and footer remain owned by
`DashboardDrawer`. Keep title, description, and close-button behavior consistent.
Explicitly set `showExport={false}` for the executive rollout.

### 2. Propagate compact sizing to the filters

Add `size?: "regular" | "compact"` to `DashboardFilters` and
`DashboardFilter`, defaulting to regular. The drawer template selects compact.

Proposed visual targets, subject to inspection in the actual drawer:

- 28px trigger height, 12px value text, approximately 14px icons.
- Approximately 4px spacing between controls and reduced horizontal padding.
- Content-aware widths instead of the fixed 140px minimum, capped by available
  width; preserve readable labels and wrap to additional rows.
- Readable menu options and keyboard-operable controls; do not scale the whole
  component with CSS transforms.

Use drawer width, not the main header's large-screen side-by-side breakpoint,
to determine wrapping. Verify long business-unit labels at both drawer sizes.

### 3. Support controlled local filter state

Add a controlled contract to `DashboardFilters`: `values` with `period`,
`businessUnit`, `project`, and `channel`, plus `onChange(nextValues)`.
Require these props together when provided; forward them through the header.
Preserve the existing store-backed fallback for main headers. A small
store adapter/presentational split can make these ownership paths explicit.

For the executive prototype:

- Reuse the existing static option lists.
- Initialize to `30d` and `all` for the other three filters.
- Selection updates the trigger value and selected menu indicator immediately.
- Keep state local to each drawer and reset on each new opening. This is a
  proposed prototype default, not a future synchronization requirement.
- Never write drawer selections to the global store or invoke a data hook.
  Dummy values, charts, and pending states stay static.
- Show: "Demo filters — displayed data is illustrative and does not change
  with these selections."

Do not introduce APIs, aggregation rules, option dependencies, persistence,
or backend changes.

### 4. Integrate through the shared drawer shell

Add an opt-in configuration such as `headerFilters={{ values, onChange }}` to
`DashboardDrawer`. When present, use `DashboardHeader template="drawer"`
inside its existing `DrawerHeader`, forwarding the title, eyebrow, description,
close action, and controlled filters. Otherwise preserve the existing header.

Forward the optional configuration through `DetailDrawer`. This supports both
direct and wrapped drawers without copying filter markup. Enable it explicitly
for executive callers; other personas are outside this rollout.

### 5. Roll out to the executive detail views

**Prerequisite:** executive drawer hosts and their opening actions do not yet
exist in the current page. Adding filters to four existing drawers is therefore
not an available implementation step.

Shared component work can proceed independently. Review it in a temporary
local preview using the existing drawer shell and dummy content. Avoid adding
permanent sample actions or rebuilding the executive dashboard for this header
change. The broader executive sections and drawer content are separate work.

When the hosts become available, enable the compact header in all four:

| Executive detail view | Integration |
| --- | --- |
| Executive pulse | Local demo selections through the drawer shell |
| Session and query details | Same four compact filters |
| Cost by BU and Project details | Same four compact filters |
| Safety and risk posture | Same four compact filters |

Use each host's actual title and opening lifecycle. Completion of the shared
component is an intermediate milestone; executive rollout is complete only when
all four reachable drawers display working filters.

## Expected implementation files

- `components/shared/dashboard/DashboardHeader.tsx`: template API and layouts.
- `components/shared/dashboard/DashboardFilters.tsx`: controlled state and sizing.
- `components/shared/dashboard/DashboardFilter.tsx`: compact styling and
  accessible names identifying each filter dimension.
- `components/shared/dashboard/DashboardDrawer.tsx`: opt-in header integration.
- `components/shared/dashboard/DetailDrawer.tsx`: forward the configuration.
- Executive drawer hosts and `app/home/executive-dashboard/page.tsx`: integration
  after the prerequisite hosts exist; exact filenames follow that work.
- `docs/shared-components/dashboard-header/README.md`: both templates, sizing,
  state ownership, and examples.

## Verification and acceptance

1. Main header appearance and behavior remain unchanged. Drawer controls are
   smaller and below the single title block, before banners and detail content.
2. Each filter opens and updates its selection; closing/reopening restores the
   specified local defaults. Selections do not leak between drawers.
3. Drawer selections do not change the main header, static content, or issue
   data requests. The illustrative behavior is explained visibly.
4. Check 400px and 720px drawers, constrained viewport widths, long labels, and
   zoom. Controls wrap without horizontal overflow and menus remain usable.
5. Check accessible names, keyboard navigation, focus return, title announcement,
   close-button operation, and Escape handling. An open menu should dismiss
   before the drawer.
6. Resolve Node/npm in UbuntuMain interactive Bash, then run targeted ESLint
   and local TypeScript checking (`tsc --noEmit`). Record existing failures
   separately. Run the existing build where its environment is available.
7. Update documentation and inspect the final diff for scope. There is no test
   script in `package.json`; do not add a test framework solely for this
   presentation change. Use an existing UI harness if available, otherwise
   record manual interaction checks.

No dependencies were added. The shared component changes are limited to the
header, filters, drawer shells, and their documentation.
