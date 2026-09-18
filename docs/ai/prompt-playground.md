Useful files:
- `app/home/tech-team-dashboard/page.tsx`
- `app/home/product-owner-dashboard/page.tsx`

The Product Owner dashboard uses a lot of hard-coded data and data defined directly in the page file. While this project currently uses mock data, if you look at the Tech Team dashboard, you will see it uses two hooks: `useTechTeamMainView` and `useDashboardFiltersStore`. 

We should use hooks as well to retrieve data from those JSON files. We need to move all the values that are currently hard-coded in the Product Owner dashboard into the JSON file allocated for that dashboard. We should then fetch that data using hooks, just as it is done in the Tech Team dashboard. Specifically, we should create a hook called `useDashboardProductOwnerMainView` and also use the `useDashboardFiltersStore`. 

The purpose of this is to simulate requesting data from Splunk so we can easily replace the connections once we have the capability to request live data. I will create a plan for this implementation; let me know when you are ready to review it so I can provide my feedback before we move to the next stage.
