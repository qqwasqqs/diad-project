# Product Owner Product Experience Pulse Drawer

**Source element:** Product experience pulse.

**Historical Gate 3 candidate:** [product-owner-product-experience-pulse-drawer-02.png](product-owner-product-experience-pulse-drawer-02.png); the implemented API Error Rate revision now supersedes its feedback panel.

**Superseded review artifact:** `product-owner-product-experience-pulse-drawer-01.png` (retained for traceability; it repeated main-view cards).

**Current implementation authority:** [`ProductOwnerProductExperiencePulseDrawer.tsx`](../../components/shared/dashboard/drawers/product-owner/ProductOwnerProductExperiencePulseDrawer.tsx) and [`product-owner-product-experience-pulse.json`](../../public/mocks/new-pages/product-owner-product-experience-pulse.json).

**Calculation authority:** [Adoption and engagement](main-view-calculations/adoption-and-engagement.md), [API Error Rate endpoint handoff](../endpoints/product-owner-dashboard-endpoints.md#api-error-rate-handoff), [End-to-End Latency](main-view-calculations/end-to-end-latency.md), and [Workflow Completion](main-view-calculations/workflow-completion-status.md).

## Design decision

Clicking the full section opens an experience-journey drawer. It replaces the
duplicated main-view cards with time-based engagement and responsiveness
context, API-error evidence readiness, workflow-measurement readiness, and the
measurement-context table. It does not claim that API errors or latency cause
a response-quality change.

## Supported drawer content

| Element | Purpose |
| --- | --- |
| Experience signals over time | Shows illustrative engagement and P95 latency trends rather than headline-card duplicates. |
| API error evidence | Shows the illustrative error percentage and aggregate coverage counts while keeping error classification and selected-scope coverage explicitly pending. |
| Workflow measurement readiness | Shows the missing workflow key, terminal outcome, denominator, and attribution requirements rather than a fabricated completion rate. |
| Measurement context table | States each displayed metric, calculation/field family, and coverage state. |

## Excluded content

No duplicated headline cards, feature-usage value, workflow percentage, raw
request IDs, per-request latency, raw error messages, error breakdown, causal
assertion, or technical component latency.

## Evidence classification

Documented source fields and current proposed calculations are in the linked
specifications. It is a likely interpretation that trend and readiness context
adds a useful second-level Product Owner question without creating a causal
analysis. All values/coverage labels are illustrative. Confirm selected-scope
attribution, session/query key, API-error numerator and denominator, terminal
timestamp and retry/final-outcome rule, latency eligibility, workflow
definition, and drawer accessibility behavior.

## Image-generation brief

```text
Use case: ui-mockup
Asset type: Product Owner main view with a right-side detail drawer
Primary request: Create a compact non-scrolling revised Product experience pulse drawer over the dimmed Product Owner Dashboard main view. It must add analytical context and evidence readiness rather than repeat the main-view headline cards.
Input images: Image 1 is the Product Owner main-view image, used as the background/layout reference. Image 2 is the Technical Teams quality drawer, used as the interaction-pattern reference only.
Composition: right white drawer about 40% screen width. Top label exactly "PRODUCT EXPERIENCE PULSE DETAILS", close X, title "Product experience pulse", subtitle "Experience signals over time and measurement readiness", scope text "Last 30 days · All business units · All projects · All channels", and amber illustrative-values banner.

Top card title exactly "Experience signals over time". It has two compact side-by-side mini-charts, not headline cards: first chart label exactly "Engagement context" with two lines legend "Sessions" and "Queries"; second chart label exactly "Responsiveness context" with one line legend "End-to-End P95" and axis label "Latency (s)". Include small text below the charts exactly "Engagement and responsiveness are adjacent signals — no causal claim".

Middle left card title exactly "API error evidence". Show the illustrative value "1.14%" with label "API errors", followed by aggregate coverage values "114" "error requests" and "10,000" "eligible requests". Beside/below it show exact pending state "ERROR CLASSIFICATION / COVERAGE PENDING" and small text "Final outcome, retry, and selected-scope rules require approval". Use neutral styling for the metric because no attention threshold is approved. Do not show raw error records or an error breakdown.

Middle right card title exactly "Workflow measurement readiness". Show a simple four-step muted evidence flow: "Workflow key", "Terminal outcome", "Eligible denominator", "Scope attribution"; each step shows "PENDING". Add exact state "DATA PENDING" and text "No workflow completion formula supplied".

Bottom table title "Measurement context" with columns "Signal", "Calculation", "Coverage" and four rows: "Session & Query Volume" "Distinct queries / sessions" "PENDING"; "API Error Rate" "Distinct error requests / eligible requests" "PENDING"; "End-to-End Latency" "P95 request latency" "PENDING"; "Workflow Completion" "Event and formula not supplied" "DATA PENDING". Bottom amber note exactly "WORKFLOW COMPLETION DEFINITION PENDING".
Constraints: no scrollbar; retain dimmed main view; do not repeat four headline cards; no feature-usage metric, causal chart/claim, raw request IDs, raw errors, technical diagnostics, recommendations, User Satisfaction Rate, or unsupported extra KPIs.
```
