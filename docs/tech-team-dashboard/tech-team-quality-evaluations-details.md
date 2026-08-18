# Technical Teams Quality Evaluations Detail

**Source element:** AI and model quality panel and `View all quality evaluations` action in [`tech-team-dashboard-alternative-02.png`](tech-team-dashboard-alternative-02.png)  
**Calculation authority:** [AI and Model Quality](main-view-calculations/ai-model-quality-chart.md), [Retrieval Quality](main-view-calculations/retrieval-quality.md), and [MLflow Correctness](main-view-calculations/mlflow-correctness.md).

## Design decision

Open a Technical Teams **Quality evaluations** detail from the panel/action. It adds scale-safe distributions, evaluator-result context, and a transparent register of other mapped quality metrics without blending incompatible score scales.

## Supported detail content

| Detail element | Added question | Fields / calculation | Feasibility |
|---|---|---|---|
| 1–5 score trends | Are groundedness, coherence, and relevance changing? | Foundry score fields; mapped averages. | Supported. |
| 1–5 score distributions | Is an average masking uneven evaluator outcomes? | Same score fields, grouped by score. | Derivable; bin/coverage rules pending. |
| Retrieval Quality summary | Is retrieval ranking quality changing? | `retrieval_score`, `retrieval_result`; average. | Supported. |
| MLflow 0–1 score area | How is Correctness behaving without mixing scales? | MLflow correctness rating average. | Supported. |
| Evaluator-result/coverage state | Are sufficient comparable evaluations present? | Foundry result fields; coverage contract absent. | Partially supported. |
| Other mapped metrics register | What further Technical Teams quality signals exist? | F1, completeness, similarity, adherence, tool accuracy, intent, MLflow/training mappings. | Documented inventory; some feasibility pending. |

## Proposed layout and interaction

Use a dedicated page with the same filters and illustrative banner. Show the three compatible 1–5 trends and a score-distribution card. Keep MLflow Correctness in a distinct `0–1` card. Show Retrieval Quality separately. Finish with **Other mapped quality evaluations**, an explicit inventory that labels unsupported/partially supported entries rather than creating invented scores. Evaluator-result context is safe pass/fail/coverage text only; it never reveals evaluator reasons, prompts, or outputs.

## Excluded content

No raw prompts/responses, retrieved content, evaluator reasons, user-level score history, model recommendation, experiment controls, training-run details, or an unapproved Hallucination percentage.

## Assumptions

- The Foundry chart remains `1–5`; MLflow Correctness remains `0–1`; no normalization is inferred.
- Valid evaluator records are weighted at the approved evaluation grain once that grain is confirmed.
- Other quality metrics are an information register, not an unsupported data visualization.
- All values are illustrative and no score threshold/state is implied.

## Missing evidence and client questions

- Which evaluator/version, population, timestamp, request/evaluation grain, and repeat-evaluation rule apply?
- What coverage/freshness level permits a score trend or distribution?
- Can online production, offline evaluation, experiments, and test datasets be combined?
- Which result encoding/threshold is approved for each evaluator?
- Can evaluations honor all global filters, and which metrics should be prioritized in the register?

## Image-generation brief

Generate only after the prior Gate 3 detail view is approved. Create a polished Technical Teams **Quality evaluations** page with preserved filters/banner. Show separate 1–5 Foundry trends/distributions, separate 0–1 MLflow Correctness, Retrieval Quality, evaluator coverage as `PENDING`, and an other-metrics register. Do not mix score scales, show raw evaluator content, invent Hallucination %, use thresholds, or include cross-persona recommendations.
