Useful files:

- `app/home/tech-team-dashboard/page.tsx`
- `app/home/product-owner-dashboard/page.tsx`

The Product Owner dashboard uses a lot of hard-coded data and data defined directly in the page file. While this project currently uses mock data, if you look at the Tech Team dashboard, you will see it uses two hooks: `useTechTeamMainView` and `useDashboardFiltersStore`.

We should use hooks as well to retrieve data from those JSON files. We need to move all the values that are currently hard-coded in the Product Owner dashboard into the JSON file allocated for that dashboard. We should then fetch that data using hooks, just as it is done in the Tech Team dashboard. Specifically, we should create a hook called `useDashboardProductOwnerMainView` and also use the `useDashboardFiltersStore`.

The purpose of this is to simulate requesting data from Splunk so we can easily replace the connections once we have the capability to request live data. I will create a plan for this implementation; let me know when you are ready to review it so I can provide my feedback before we move to the next stage.

 **Start by tracing both pages and their data sources.** The demo currently requests one metrics response and two independent chart responses. The real page also contains Channel Mix, Trust and Measurement Readiness, five drawers, hardcoded chart values, and direct JSON mock imports. Account for every displayed value; simply adding the demo hook to the real page is not sufficient.

 **Migrate the real page:**

> - Read the active period, business unit, and project filters from the filter store. Use the endpoint hooks to drive the covered metric cards, both charts, and their supporting statistics.
> - Preserve the existing layout and presentation. Give each request its own loading and error state so one failed chart does not erase successful cards or the other chart.
> - Remove hardcoded or directly imported mock *values* from the real page. Keep static explanatory copy as application content. For sections and drawers the current endpoints do not cover, define the necessary contracts and wire them when approved; otherwise show an honest pending or unavailable state. Do not present fixture values as live data.
> - Make drawer values consistent with the main view. Reuse cached data where it covers the drawer, and fetch missing detail only when its drawer opens. Do not invent drawer IDs, payloads, or metric definitions.
> - Resolve discrepancies between the real page and current contract, including its “User Satisfaction Rate” card versus the endpoint’s “API Error Rate,” against the approved Product Owner definitions before displaying a numeric value.
>
> **Complete the server path where the contract permits it.** Keep unset or `local` `ENVIRONMENT` on mocks; `dev` and `prod` must use Splunk without falling back to mocks. The current [Splunk source](lib/server/dashboard/dashboardSplunkSource.ts) is a placeholder: it does not forward dashboard filters or map Splunk results. Obtain or locate approved saved-search routing, filter argument rules, and representative results before replacing that behavior. Map actual results to the existing endpoint DTOs and report only filters demonstrably applied. If those details are unavailable, complete the independently implementable page migration, retain a clear live-path error, and list the exact blockers. Do not describe a 501 response or an unfiltered search as a working Splunk connection.
>
> Rename demo-specific production hooks or modules where appropriate, while retaining clearly named **local mock** fixtures and their illustrative labeling. Retire or update the demo page and its documentation once the real page supersedes them. Preserve unrelated changes already in the worktree.
>
> Validate local mock behavior, filter changes, independent request states, main-view/drawer consistency, and the dev/prod source selection. Run focused typecheck and lint checks. Report which sections are fully wired, which remain pending, and whether a filtered Splunk request was actually verified.

The key constraint is that the demo proves the **request path**, but currently covers only part of the real page. The agent should migrate what is supported without making the remaining sections appear live before their contracts exist.


---

Move the endpoint flow from the architecture demo page (`app/home/product-owner-dashboard/architecture-demo/page.tsx`) into the real Product Owner page (`app/home/product-owner-dashboard/page.tsx`). This stage is for review. Do not deploy. Stage two will handle the drawers immediately afterward.

First, compare the two pages and identify every value displayed on the real page. Reuse the existing Product Owner endpoint hooks, browser service, routes, and adapters. Rename demo-specific hook names when they become part of the real page.

Wire the main page’s supported metric cards and two chart families to the endpoint results. Read period, business unit, and project from the filter store. Preserve the page layout and give the metrics and each chart independent loading and error states. Keep the local mock pipeline working when ENVIRONMENT is unset or local.

The real page has sections beyond the demo’s four metrics and two charts. Check each main-view value against the approved endpoint contract. Do not leave hardcoded numbers presenting themselves as live results, and do not invent a Splunk mapping or metric definition for uncovered sections. Preserve explicit pending states where appropriate and report any main-view section that cannot yet be wired.

Leave all five drawers on their current mock data for this stage. Do not build drawer hooks, change drawer contracts, add environment-dependent illustrative labels, or migrate drawer data. Any temporary difference between a main-view value and its drawer is accepted during this review stage; list those differences in your handoff so stage two can address them.

The Splunk source still needs confirmed saved-search routing, filter arguments, and result fields. Complete a filtered live connection only where those contracts can be verified. Otherwise, finish the main-page migration, retain a clear failure in dev/prod, and report the precise missing Splunk details. Do not describe an unfiltered call or placeholder response as a working connection.

Run focused typecheck, lint, and local mock-flow validation. Report which main-view sections use endpoint data, which remain pending, what Splunk work is blocked, and which drawer discrepancies stage two must resolve. Preserve unrelated worktree changes and do not deploy.
