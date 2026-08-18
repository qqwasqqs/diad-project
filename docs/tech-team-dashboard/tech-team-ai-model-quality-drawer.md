# Technical Teams AI and Model Quality Drawer

**Source element:** the **AI and model quality** panel, including the three-series score chart, Retrieval Quality, and MLflow Correctness.  
**Approved Gate 3 image:** [tech-team-ai-model-quality-drawer-01.png](tech-team-ai-model-quality-drawer-01.png)  
**Calculation authority:** [AI and Model Quality](main-view-calculations/ai-model-quality-chart.md), [Retrieval Quality](main-view-calculations/retrieval-quality.md), and [MLflow Correctness](main-view-calculations/mlflow-correctness.md).

## Design decision

Clicking AI and model quality opens a right-side drawer. It keeps the three comparable `1–5` evaluator series together and keeps Retrieval Quality (`1–5`) and MLflow Correctness (`0–1`) visibly separate.

## Supported drawer content

| Drawer element | Evidence and purpose |
|---|---|
| Three-series quality trend | Groundedness, Response Coherence, and Relevance Quality on the shared documented `1–5` scale. |
| Supporting-score cards | Retrieval Quality `4.0 / 5` and MLflow Correctness `0.88 / 1`, with distinct scale labels. |
| Score calculation table | Identifies each average score and its scale; does not normalize values. |
| Evaluator-coverage state | `EVALUATOR COVERAGE PENDING` acknowledges that score coverage/freshness are not supplied. |

## Excluded content

No Hallucination percentage, raw prompts/responses, retrieved content, evaluator reasons, pass/fail threshold, user identity, model recommendation, training-run detail, or combined cross-scale score.

## Evidence classification

### Confirmed facts

- Three mapped Foundry evaluator scores use a `1–5` Likert scale and support averages.
- Retrieval Quality is `1–5`; MLflow Correctness is `0–1`.

### Likely interpretation

The panel is one quality-comparison element, but score scales must remain visible to avoid a misleading combined evaluation.

### Assumptions

The drawer is non-scrolling. Other mapped quality metrics are not added because the visible panel does not show them; its `View all quality evaluations` action can be designed separately later.

### Missing evidence and client questions

Which evaluator/version, score population, request/evaluation grain, duplicate rule, timestamp/timezone, coverage/freshness, global-filter attribution, precision, and threshold semantics are approved? What does the future `View all quality evaluations` action contain?

## Image-generation brief

```text
Use case: ui-mockup
Asset type: Technical Teams main view with a right-side detail drawer
Primary request: Create a compact non-scrolling AI and model quality drawer over the dimmed Technical Teams main view.
Input images: Image 1 is the Technical Teams main-view reference; Image 2 is the Executive drawer reference for interaction pattern only.
Composition: Right drawer top text exactly “AI AND MODEL QUALITY DETAILS”, title “AI and model quality”, subtitle “Evaluator scores with explicit scale separation”. Include the illustrative-values banner. Show a card titled “Quality trend” with exactly three legend labels “Groundedness”, “Response Coherence”, “Relevance Quality” on a `1–5` axis. Show two supporting cards: “Retrieval Quality” “4.0 / 5” and “MLflow Correctness” “0.88 / 1”. Add a table titled “Score calculation context” with columns “Metric”, “Calculation”, “Scale”, “Filter coverage”; coverage says “PENDING”. Add exact amber label “EVALUATOR COVERAGE PENDING”.
Constraints: No scrollbar. Do not show Hallucination %, raw evaluator content, pass/fail thresholds, user data, recommendations, training metrics, or any chart that mixes 1–5 and 0–1 scales.
```
