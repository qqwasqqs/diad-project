# Product Owner Experience Quality Evidence Drawer

**Source element:** Experience and response quality.  
**Current Gate 3 candidate:** [product-owner-experience-and-response-quality-drawer-02.png](product-owner-experience-and-response-quality-drawer-02.png).  
**Superseded review artifact:** `product-owner-experience-and-response-quality-drawer-01.png` (retained for traceability; it repeated the main-view trend, scores, satisfaction, and latency).  
**Calculation authority:** [Experience and response quality trend](main-view-calculations/experience-and-response-quality-trend.md), [Supporting quality scores](main-view-calculations/supporting-quality-scores.md), [User Satisfaction Rate](main-view-calculations/user-satisfaction-rate.md), and [End-to-End Latency](main-view-calculations/end-to-end-latency.md).

## Design decision

Clicking the section opens an Experience quality evidence drawer. It replaces
the duplicated score trend/cards with evaluator coverage, score-definition
compatibility, and evidence needed to relate quality signals to user experience.
It helps a Product Owner judge whether quality signals are decision-ready,
without claiming they explain satisfaction or responsiveness.

## Supported drawer content

| Element | Evidence and purpose |
| --- | --- |
| Evaluator coverage by signal | Shows Groundedness, Relevance Quality, Intent Resolution, Retrieval Quality, and Task Adherence as `COVERAGE PENDING`, not fabricated percentages. |
| Score-definition map | Lists documented average calculation, known scale, record-grain state, and open definition for each score. |
| Comparability guardrails | Separates confirmed `1–5` scores from Intent Resolution's unresolved scale and prohibits a composite quality score. |
| Experience-link evidence | Shows separate pending needs for feedback-quality and latency-quality correlation. |
| Current context | Retains one non-analytic illustrative context row: `84% positive · P95 1.20 s`; no cards, trend, or causal claim. |

## Excluded content

No repeated quality trend, score cards, satisfaction/latency cards, composite
quality score, Hallucination percentage, F1/MLflow score, evaluator reasons,
raw evaluator or retrieved content, prompts/responses, user data, model
configuration, technical diagnostics, or causal claim.

## Evidence classification

### Confirmed facts

- Groundedness, Relevance Quality, Retrieval Quality, and Task Adherence are
  documented average score metrics on a stated `1–5` Likert scale.
- Intent Resolution has an average formula, but its mapping does not explicitly
  restate a compatible display scale.
- User feedback and UI latency use different documented data families; no
  approved correlation rule is supplied.

### Likely interpretations

- Coverage and comparability are the first Product Owner questions before a
  score trend drives a product decision.

### Assumptions

- `COVERAGE PENDING` is a nonnumeric evidence state.
- The context row uses the main-view illustrative values only and does not
  establish a correlation or comparison period.

### Missing evidence and client questions

Confirm evaluator/version, online/offline population, score record grain,
deduplication, scale/direction for Intent Resolution, coverage threshold,
timestamp/timezone, global attribution, and feedback/latency-to-quality joins.

## Image-generation brief

```text
Use case: ui-mockup
Asset type: Product Owner main view with a right-side detail drawer
Primary request: Create a compact non-scrolling revised Experience quality evidence drawer over the dimmed Product Owner Dashboard main view. It must show whether quality signals are decision-ready, not repeat the main-view quality trend, supporting scores, satisfaction, or latency cards.
Input images: Image 1 is the Product Owner main-view image, used as background/layout reference. Image 2 is the Technical Teams quality drawer, used only as interaction-pattern reference.
Composition: right white drawer about 40% screen width. Top label exactly "EXPERIENCE QUALITY EVIDENCE DETAILS", close X, title "Experience quality evidence", subtitle "Coverage, comparability, and experience-link readiness", scope text "Last 30 days · All business units · All projects · All channels", and the amber illustrative-values banner.

Top card title exactly "Evaluator coverage by signal". Show five clear rows: "Groundedness", "Relevance Quality", "Intent Resolution", "Retrieval Quality", "Task Adherence"; each row has exact state "COVERAGE PENDING". Add small text "Coverage threshold and evaluation population not supplied".

Middle left card title exactly "Score-definition map". Show a compact table with columns exactly "Signal", "Calculation", "Scale", "Record grain". Rows: "Groundedness" "AVG score" "1–5" "PENDING"; "Relevance Quality" "AVG score" "1–5" "PENDING"; "Intent Resolution" "AVG score" "SCALE PENDING" "PENDING"; "Retrieval Quality" "AVG score" "1–5" "PENDING"; "Task Adherence" "AVG score" "1–5" "PENDING".

Middle right card title exactly "Comparability guardrails". Show three short checks: "Confirmed 1–5 signals stay separate", "Intent Resolution scale requires approval", "Composite quality score not authorized". Each is a clear neutral/amber evidence statement, not a numerical score.

Lower card title exactly "Experience-link evidence". Show two rows: "Feedback ↔ quality correlation" "PENDING" with small text "Requires approved request correlation and feedback timestamp"; "Latency ↔ quality correlation" "PENDING" with small text "Requires a shared request population and time alignment". Below them show one compact neutral context row exactly "CONTEXT ONLY — 84% positive · P95 1.20 s · NO CAUSAL CLAIM".

Bottom amber note exactly "EVALUATOR COVERAGE AND COMPARABILITY PENDING".
Constraints: no scrollbar; retain dimmed main view; no repeat quality chart, score cards, satisfaction/latency cards, composite score, Hallucination, F1, MLflow scores, raw evaluator content, thresholds, user data, model configuration, technical diagnostics, causal evidence, or extra KPIs.
```
