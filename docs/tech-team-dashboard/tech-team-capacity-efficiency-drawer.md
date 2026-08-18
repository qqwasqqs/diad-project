# Technical Teams Capacity and Efficiency Drawer

**Source element:** the **Capacity and efficiency** panel.  
**Approved Gate 3 image:** [tech-team-capacity-efficiency-drawer-01.png](tech-team-capacity-efficiency-drawer-01.png)  
**Calculation authority:** [Cost per Request](main-view-calculations/cost-per-request.md), [Token Usage / Request](main-view-calculations/token-usage-per-request.md), [Token Throughput](main-view-calculations/token-throughput-status.md), [Available Token Limit](main-view-calculations/available-token-limit-status.md), and [Cache Hit Ratio](main-view-calculations/cache-hit-ratio-status.md).

## Design decision

Clicking Capacity and efficiency opens a right-side drawer that distinguishes its two calculated values from its three explicit unresolved-definition states.

## Supported drawer content

| Drawer element | Evidence and purpose |
|---|---|
| Cost per Request and Token Usage / Request cards | Present illustrative `$0.12` and `2.4K tokens` with their separate units. |
| Calculation context | Explains request-level cost and total-token usage, without adding an unapproved trend or target. |
| Definition register | Clearly preserves `DEFINITION PENDING`, `DEFINITION PENDING`, and `FORMULA PENDING`. |
| Coverage note | Indicates that global-filter attribution and cost/token coverage require validation. |

## Excluded content

No cost budget, total cost, ROI, capacity utilization, remaining quota, cache percentage, model/deployment names, pricing quotation, or thresholds.

## Evidence classification

### Confirmed facts

- Cost per Request and Token Usage / Request have documented fields/calculations.
- Token Throughput, Available Token Limit, and Cache Hit Ratio are visibly pending in the main view.

### Likely interpretation

The detail should explain the usability boundary of efficiency signals rather than manufacture a capacity dashboard.

### Assumptions

The drawer fits without scroll and uses illustrative USD only. No trend/distribution is shown before the relevant aggregation rules are approved.

### Missing evidence and client questions

Which pricing source, currency, request/call/retry rule, token source, cache treatment, global-filter attribution, timezone, coverage, and precision apply? What authoritative definition supports the three pending signals?

## Image-generation brief

```text
Use case: ui-mockup
Asset type: Technical Teams main view with a right-side detail drawer
Primary request: Create a compact non-scrolling Capacity and efficiency drawer over the dimmed Technical Teams main view.
Input images: Image 1 is the Technical Teams main-view reference; Image 2 is the Executive drawer reference for interaction pattern only.
Composition: Right drawer top text exactly “CAPACITY AND EFFICIENCY DETAILS”, title “Capacity and efficiency”, subtitle “Request cost, token usage, and definition readiness”. Show the illustrative-values banner. Show cards “Cost per Request” “$0.12” and “Token Usage / Request” “2.4K tokens”. Add a card titled “Calculation context” with rows “Cost per Request” “Average included token cost per request” and “Token Usage / Request” “Average total tokens per request”; filter coverage says “PENDING”. Add a card titled “Definitions required before capacity reporting” with exact rows “Token Throughput” “DEFINITION PENDING”; “Available Token Limit” “DEFINITION PENDING”; “Cache Hit Ratio” “FORMULA PENDING”.
Constraints: No scrollbar. Do not show budgets, total cost, ROI, quota, capacity utilization, cache percentage, models/deployments, targets, or real pricing.
```
