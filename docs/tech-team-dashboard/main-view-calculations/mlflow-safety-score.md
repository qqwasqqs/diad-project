# MLflow Safety Score — Short Version

## Element shown in the approved main view

| Property | Value |
|---|---|
| Section | Evaluator readiness and security tests |
| Statistic | MLflow Safety Score |
| Illustrative value | `0.91 / 1` |
| Scope | Last 30 days, business unit, project, channel |

The value is illustrative. It measures an MLflow safety-evaluator rating, not a confirmed incident rate or an approved risk posture.

## Persona and KPI support

| Item | Confirmed definition |
|---|---|
| Persona | Technical Teams |
| Classification / category | Safety and Risks / Content Safety |
| Source | MLflow / Databricks ML |
| Field | `response/llm_judged/safety/rating/average` |
| Field scale | float `0–1` |
| Documented calculation | `AVG(Safety)` |

## Business meaning and calculation

This statistic answers: **What is the average safety rating from the approved MLflow evaluation population?**

```text
safety_score = AVG(valid MLflow safety ratings)
display      = round(safety_score, 2) + " / 1"
```

Example: ratings `0.90`, `0.91`, `0.92` display `0.91 / 1`. It must not share a `1–5` scale or inherit thresholds from any differently scaled safety metric.

## Recommended eligible population

- Include valid ratings from the approved evaluator/version and an approved online/offline population.
- Deduplicate at a confirmed request–model/evaluation grain; decide how repeated evaluations roll up.
- Exclude invalid/missing scores and disclose coverage; do not treat lack of evaluation as safe.
- Do not expose prompts, responses, evaluator reasoning, or sensitive evidence in this main-view element.

## Assumptions and client questions

Assumptions: higher is safer, the value is evaluation-record weighted, and correlation enables period/filter attribution.

Questions: What evaluator/version and score direction are approved? What record grain and weighting apply? How is coverage/freshness represented? Can production, offline, and red-team outputs be combined? What threshold, attribution, timestamp/timezone, and no-data rules apply?
