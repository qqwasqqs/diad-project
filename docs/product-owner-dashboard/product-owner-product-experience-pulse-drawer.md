# Product Owner Product Experience Pulse Drawer

**Source element:** Product experience pulse.  
**Current Gate 3 candidate:** [product-owner-product-experience-pulse-drawer-02.png](product-owner-product-experience-pulse-drawer-02.png).  
**Superseded review artifact:** `product-owner-product-experience-pulse-drawer-01.png` (retained for traceability; it repeated main-view cards).  
**Calculation authority:** [Adoption and engagement](main-view-calculations/adoption-and-engagement.md), [User Satisfaction Rate](main-view-calculations/user-satisfaction-rate.md), [End-to-End Latency](main-view-calculations/end-to-end-latency.md), and [Workflow Completion](main-view-calculations/workflow-completion-status.md).

## Design decision

Clicking the full section opens an experience-journey drawer. It replaces the
duplicated main-view cards with time-based engagement and responsiveness
context, feedback evidence readiness, workflow-measurement readiness, and the
measurement-context table. It does not claim that latency causes satisfaction.

## Supported drawer content

| Element | Purpose |
| --- | --- |
| Experience signals over time | Shows illustrative engagement and P95 latency trends rather than headline-card duplicates. |
| Feedback evidence | Retains the positive/negative composition as context and makes missing feedback-trend/correlation evidence explicit. |
| Workflow measurement readiness | Shows the missing workflow key, terminal outcome, denominator, and attribution requirements rather than a fabricated completion rate. |
| Measurement context table | States each displayed metric, calculation/field family, and coverage state. |

## Excluded content

No duplicated headline cards, feature-usage value, workflow percentage, raw
feedback, user IDs, per-request latency, error breakdown, causal assertion, or
technical component latency.

## Evidence classification

Confirmed metric fields/formulas are in the linked calculation specifications.
It is a likely interpretation that trend and readiness context adds a useful
second-level Product Owner question without creating a causal analysis. All
values/coverage labels are illustrative. Confirm selected-scope attribution,
session/query key, feedback scale and timestamp/correlation, latency
eligibility, workflow definition, and drawer accessibility behavior.

## Image-generation brief

```text
Use case: ui-mockup
Asset type: Product Owner main view with a right-side detail drawer
Primary request: Create a compact non-scrolling revised Product experience pulse drawer over the dimmed Product Owner Dashboard main view. It must add analytical context and evidence readiness rather than repeat the main-view headline cards.
Input images: Image 1 is the Product Owner main-view image, used as the background/layout reference. Image 2 is the Technical Teams quality drawer, used as the interaction-pattern reference only.
Composition: right white drawer about 40% screen width. Top label exactly "PRODUCT EXPERIENCE PULSE DETAILS", close X, title "Product experience pulse", subtitle "Experience signals over time and measurement readiness", scope text "Last 30 days · All business units · All projects · All channels", and amber illustrative-values banner.

Top card title exactly "Experience signals over time". It has two compact stacked mini-charts, not headline cards: first chart label exactly "Engagement context" with two lines legend "Sessions" and "Queries"; second chart label exactly "Responsiveness context" with one line legend "End-to-End P95" and axis label "Latency (s)". Include small text below the charts exactly "Engagement and responsiveness are adjacent signals — no causal claim".

Middle left card title exactly "Feedback evidence". Show a small composition bar labeled "84% positive" and "16% negative". Beside/below it show exact amber state "FEEDBACK TREND / COVERAGE PENDING" and small text "Timestamp and request correlation require approval". Do not show a feedback trend.

Middle right card title exactly "Workflow measurement readiness". Show a simple four-step muted evidence flow: "Workflow key", "Terminal outcome", "Eligible denominator", "Scope attribution"; each step shows "PENDING". Add exact state "DATA PENDING" and text "No workflow completion formula supplied".

Bottom table title "Measurement context" with columns "Signal", "Calculation", "Coverage" and four rows: "Session & Query Volume" "Distinct queries / sessions" "PENDING"; "User Satisfaction Rate" "Valid feedback share" "PENDING"; "End-to-End Latency" "P95 request latency" "PENDING"; "Workflow Completion" "Event and formula not supplied" "DATA PENDING". Bottom amber note exactly "WORKFLOW COMPLETION DEFINITION PENDING".
Constraints: no scrollbar; retain dimmed main view; do not repeat four headline cards; no feature-usage metric, fabricated feedback trend, causal chart/claim, raw feedback/user data, raw errors, technical diagnostics, recommendations, or unsupported extra KPIs.
```
