# Cost by BU and Project Chart — Short Version

This document covers the chart-specific cost attribution and grouping rules. The underlying token-pricing and request-cost calculation is defined in [Cost per Request Card — Short Version](cost-per-request-card-short.md) and is not repeated here.

## Chart shown in the concept

| Property | Concept value |
|---|---|
| Section | Cost allocation, below Executive pulse |
| Chart | Cost by BU and Project |
| Visualization | Horizontal business-unit bars with smaller project bars |
| Series | Business Unit and Project |
| Example business-unit values | `$7.68K`, `$5.42K`, `$3.76K` |
| Example project values | `$4.21K`, `$2.93K`, `$1.94K` |
| Related state | Infrastructure Cost — `DATA PENDING` |
| Visible scope | Last 30 days, business unit, project, and channel |

Business Unit A/B/C, Project A1/B1/C1, and all displayed values are illustrative placeholders.

## Persona and KPI support

| Item | Confirmed definition |
|---|---|
| Persona | Business Executives |
| Classification | Cost |
| KPI category | Cost Evaluation |
| Metric | Cost by BU and Project |
| Source | All components for attribution fields |
| Fields | `business_unit`, `project_name` |
| Source calculation | Aggregate `cost_per_request` by business unit and project; average if required |

The source supports both aggregation and optional averaging but does not select one for this chart. The concept's `$K` allocation bars are most consistent with **summed cost**, while average cost is already shown in the Cost per Request card.

The detailed logging schema uses `l1_bu`, `l2_bu`, and `project_name`, while the persona mapping uses `business_unit` and `project_name`. The authoritative business-unit level and field normalization require client confirmation.

## Cost attribution semantics

- `request_cost`: included AI token cost for one user request, calculated using the linked Cost per Request specification.
- `business_unit`: organizational owner to which the request cost is attributed.
- `project_name`: project or use case within the owning business unit.
- Business-unit cost: sum of attributed request costs for the business unit.
- Project cost: sum of attributed request costs for the project within its business unit.

A project value is a subset of its business-unit total. It must not be added to the business-unit bar as if it were a separate cost category.

Infrastructure Cost is a separate Executive metric. It has no confirmed calculation contract and must not be included in the business-unit or project token-cost bars while it remains `DATA PENDING`.

## Business meaning

The likely Executive interpretation is:

> How is the included AI token cost distributed across business units and their projects in the selected scope?

The chart explains organizational cost allocation. It does not show average request cost, total infrastructure cost, or total cost of ownership.

## Per-request attribution

After applying the request-cost rules from the linked specification, each eligible request needs an attribution record:

```text
request_key
request_cost
business_unit
project_name
currency_code
event_timestamp
```

The preferred rule is one owning business unit and one owning project per request. Shared or cross-project requests require an approved allocation rule rather than duplicating the full request cost into every related group.

## Chart aggregation

Apply the selected time, authorization, channel, and other global filters before grouping:

```text
business_unit_cost =
  SUM(request_cost) GROUP BY business_unit

project_cost =
  SUM(request_cost) GROUP BY business_unit, project_name

project_share_of_bu =
  (project_cost / business_unit_cost) * 100
```

Illustrative example:

```text
Business Unit A cost: $7.68K
Project A1 cost:      $4.21K

Project A1 share = ($4.21K / $7.68K) * 100
                 = 54.8%

Other projects or unattributed cost in BU A:
$7.68K - $4.21K = $3.47K
```

If only one project is shown under each business unit, the UI must label whether it is the top project, selected project, or another approved representative value. Otherwise, users may incorrectly assume the displayed project is the business unit's only project.

## Recommended eligible population

Use the eligible request costs defined in the [Cost per Request specification](cost-per-request-card-short.md#recommended-eligible-population). Chart-specific recommendations are:

- Attribute cost after model-call deduplication and per-request cost aggregation.
- Use one approved business-unit/project ownership record per request.
- Keep unresolved ownership in an explicit `Unattributed` group instead of silently removing it.
- Do not duplicate one request's full cost across multiple projects or business units.
- Aggregate only records expressed in the same approved currency.
- Apply identical authorization and global-filter scope to business-unit and project values.
- Keep Infrastructure Cost separate from the token-cost aggregation.

## Assumptions

- The chart displays summed Azure OpenAI token cost, not average cost per request.
- The underlying `request_cost` follows the existing Cost per Request specification.
- `business_unit` will be normalized from the approved organizational hierarchy, potentially using `l1_bu` or `l2_bu`.
- Each project has one owning business unit.
- Each request has one owning project unless an approved shared-cost allocation rule applies.
- The smaller project bar represents a subset of the associated business-unit total.
- The concept shows one representative project per business unit; the selection rule is not confirmed.
- Business units are displayed in descending cost order.
- The `$` symbol represents USD for the concept only.
- Infrastructure Cost remains excluded and `DATA PENDING`.
- Splunk or an approved API layer performs attribution, filtering, grouping, and aggregation.

## Potential questions for the client

1. Should the chart show summed cost, average cost per request, or both?
2. Does the chart cover Azure OpenAI token cost only, or a broader approved AI-cost definition?
3. Which field is the authoritative business-unit dimension: `business_unit`, `l1_bu`, `l2_bu`, department, business domain, or another field?
4. What is the approved hierarchy between business unit, project, application, and use case?
5. Can a project belong to more than one business unit?
6. How should shared requests or shared platform costs be allocated across business units and projects?
7. What should happen to costs with missing or conflicting ownership fields?
8. Does the smaller project bar represent the top project, selected project, all projects combined, or another rule?
9. How many business units and projects should be displayed before grouping the remainder into `Other`?
10. How should the chart respond when a global business-unit or project filter is selected?
11. Should project values be selectable for an Executive detail view, and what authorization rules apply?
12. Which timestamp assigns cost to the selected reporting period?
13. What currency, conversion, compact-number, and rounding rules should be used?
14. What Azure Cost Management contract is required before Infrastructure Cost can replace `DATA PENDING`?
15. How should partial attribution or incomplete cost telemetry be communicated?
16. What are the required loading, no-data, `Data Pending`, stale-data, and API-error states?
