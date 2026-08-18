# Product Owner Feature Measurement Decision Canvas

**Source element:** Feature usage evidence.  
**Current Gate 3 candidate:** [product-owner-feature-usage-evidence-drawer-02.png](product-owner-feature-usage-evidence-drawer-02.png).  
**Superseded review artifact:** `product-owner-feature-usage-evidence-drawer-01.png` (retained for traceability; it was a static evidence checklist).  
**Calculation authority:** [Feature usage evidence status](main-view-calculations/feature-usage-evidence-status.md).

## Design decision

Clicking Feature usage evidence opens a Feature measurement decision canvas.
It retains the explicit `DATA PENDING` state but turns the gap into a Product
Owner decision aid: what does feature use mean, which evidence enables each
choice, and which ownership decisions are required before a metric is shown.

## Supported drawer content

| Element | Evidence and purpose |
| --- | --- |
| Measurement choice | Presents three mutually exclusive candidate purposes—Usage events, Feature adoption, Repeat feature use—without selecting one or inventing a rate. |
| Minimum evidence map | Groups feature identifier, usage event, exposure population, key/timestamp, and scope attribution by the measurement choice they enable. |
| Conditional formula shapes | Shows only proposed formulas, explicitly pending client approval. |
| Decision log | Surfaces the Product Owner decisions: taxonomy owner, eligibility/exposure owner, and privacy/minimum-cohort decision. |
| Outcome distinction | States that feature use, workflow completion, satisfaction, and session/query volume remain distinct measures. |

## Excluded content

No numeric feature metric, feature name, workflow-completion percentage, event
stream, schema, endpoint, code, user data, implementation instruction, or
assertion that an option has been approved.

## Evidence classification

### Confirmed facts

- Feature usage is a documented Product Owner need.
- The supplied mapping has no feature identifier, feature event, exposure or
  eligibility field, feature-usage formula, or feature-level denominator.

### Likely interpretations

- The Product Owner needs to decide whether the desired outcome is raw usage,
  adoption, or repeat usage before an instrumentation or dashboard metric can
  be designed.

### Assumptions

- The three measurement choices are mutually exclusive starting points for a
  decision, not a complete or approved product taxonomy.
- Formula shapes are illustrative proposals only.

### Missing evidence and client questions

Confirm feature taxonomy and owner; use/exposure events; user/session/request
grain; key/timestamp; repeat-use definition/window; privacy/minimum cohort;
BU/project/channel attribution; measurement owner; and no-data/not-applicable
behavior.

## Image-generation brief

```text
Use case: ui-mockup
Asset type: Product Owner main view with a right-side detail drawer
Primary request: Create a compact non-scrolling revised Feature measurement decision canvas over the dimmed Product Owner Dashboard main view. It must be useful with no feature telemetry and must not invent a feature metric.
Input images: Image 1 is the Product Owner main-view image, used as background/layout reference. Image 2 is the Technical Teams quality drawer, used only as interaction-pattern reference.
Composition: right white drawer about 40% screen width. Top label exactly "FEATURE MEASUREMENT DECISION DETAILS", close X, title "Feature measurement decision", subtitle "Choose what feature use should mean before measuring it", scope text "Last 30 days · All business units · All projects · All channels", and the amber illustrative-values banner.

Top state row: exact large text "DATA PENDING" and small text "No feature identifier or usage formula supplied".

Card title exactly "Question to decide". Show three equal choice tiles, each marked "PENDING": "Usage events" with small text "How often is a feature used?"; "Feature adoption" with small text "Who uses an available feature?"; "Repeat feature use" with small text "Who returns to use it again?". Add exact note "SELECT ONE MEASUREMENT PURPOSE BEFORE DEFINING A KPI".

Card title exactly "Minimum evidence map". Show five concise rows with the measurements enabled: "Feature identifier" "All choices" "PENDING"; "Approved usage event" "Usage events · adoption · repeat use" "PENDING"; "Exposure or eligible population" "Adoption · repeat use" "PENDING"; "Event key and timestamp" "All choices" "PENDING"; "Business unit, project, and channel attribution" "Scoped reporting" "PENDING".

Card title exactly "Conditional formula shapes". Show three small nonnumeric formula lines: "Usage count = distinct eligible usage events"; "Adoption rate = users or sessions using feature / eligible exposed users or sessions"; "Repeat-use rate = users or sessions using feature again / users or sessions using feature". Above them place exact amber label "PROPOSED FORMULAS — CLIENT APPROVAL REQUIRED".

Card title exactly "Decision log". Show three rows: "Feature taxonomy owner" "PENDING"; "Eligibility and exposure owner" "PENDING"; "Privacy and minimum cohort decision" "PENDING".

Bottom neutral note exactly "FEATURE USE, WORKFLOW COMPLETION, SATISFACTION, AND SESSION VOLUME ARE DISTINCT MEASURES".
Constraints: no scrollbar; retain dimmed main view; no named feature, numeric usage/adoption/repeat rate, workflow completion metric, raw events, schema, endpoint, code, user data, implementation steps, technical diagnostics, or unsupported extra metric.
```
