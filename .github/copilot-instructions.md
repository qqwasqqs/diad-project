# Copilot Instructions for This Repository

## Project Focus

This is a Next.js App Router application used for front-end development of dashboard components.

For local development, focus on UI behavior, layout, and component composition with dummy JSON data.
Do not spend time on the login module or ACL module unless a task explicitly requires it. Those flows are deactivated in the local environment.

## Local Development Rules

- Treat local work as front-end only.
- Use static mock data from `public/mocks/new-pages/*` for new or local-only UI work.
- Do not assume external systems are reachable from the local machine.
- Databricks, Splunk, and SQL database connections exist in the codebase, but they are not enabled on the local machine.
- Avoid deep changes to backend integration code unless the task is specifically about non-local behavior.

## Architecture At A Glance

The project follows a simple layered flow:

1. `app/layout.tsx` and `app/home/layout.tsx` define the root and dashboard shell layouts.
2. `app/home/*` contains the page entry points for the dashboard experiences.
3. `components/*` contains shared UI, charts, layout pieces, and reusable widgets.
4. `hooks/*` contains React hooks that load and shape screen data for components.
5. `lib/services/*` contains service wrappers used by hooks and pages.
6. `app/api/*` contains route handlers when a screen needs server-side data shaping or permission-aware responses.
7. `lib/azure/*`, `lib/rbac/*`, and related integration code support non-local authentication, authorization, and external system access.
8. `public/mocks/new-pages/*` is the preferred source for local dummy JSON payloads.

Data flow is generally:

page -> hook -> service -> API route -> integration layer -> data source -> response -> UI

For local front-end work, the flow usually stops at mock JSON in `public/mocks/new-pages/*`.

## Where To Find Scope Documentation

Use the docs folder as the reference point for dashboard scope and supporting design material.

Start here:

- `docs/observability-business-logic.md`
- `docs/dashboard-and-reporting-design.md`
- `docs/shared-components/README.md`
- `docs/shared-components/kpi-components-fluent-2/README.md`
- `docs/executive-dashboard/*`
- `docs/product-owner-dashboard/*`
- `docs/tech-team-dashboard/*`
- `docs/operations-team-dashboard/*`

Do not copy the full business logic from these documents into code comments or prompt text. Use them only as navigation and reference points when you need to find the relevant source files.

## Important Source Areas

- `app/home/*`: dashboard pages and route-level composition
- `components/layout/*`: app shell and navigation
- `components/ui/*`: reusable dashboard widgets
- `components/charts/*`: chart primitives and chart wrappers
- `hooks/*`: client data loading and view model preparation
- `lib/services/*`: API-facing service wrappers
- `app/api/*`: server route handlers
- `public/mocks/new-pages/*`: local mock JSON for front-end-only development

## Working Style For Copilot

- Prefer the smallest UI-safe change that satisfies the request.
- Keep new work consistent with the existing layout and component patterns.
- Use dummy data instead of inventing backend dependencies for local work.
- If a task touches authentication, ACL, Databricks, Splunk, or SQL integrations, treat those as non-local concerns unless the user explicitly asks otherwise.
- When in doubt, follow the architecture above and look for the nearest page, hook, service, or component that already owns the behavior.
