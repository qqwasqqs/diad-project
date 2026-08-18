# MLflow Correctness — Short Version

## Element shown in the approved main view

| Property | Value |
|---|---|
| Section | AI and model quality |
| Statistic | MLflow Correctness |
| Illustrative value | `0.88 / 1` |
| Scope | Last 30 days, business unit, project, channel |

The `0–1` scale is intentionally displayed separately from the `1–5` chart. The value and favorable styling are illustrative; thresholds are unapproved.

## Persona and KPI support

| Item | Confirmed definition |
|---|---|
| Persona | Technical Teams |
| Classification / category | Quality / ML Evaluation |
| Source | MLflow / Databricks ML |
| Field | `response/llm_judged/correctness/rating/average` |
| Field scale | float `0–1` |
| Documented calculation | `AVG(MLflow Correctness Score)` |

## Business meaning and calculation

This statistic answers: **What was the average MLflow judge correctness rating for the approved evaluation population?**

```text
correctness = AVG(valid correctness_rating)
display     = round(correctness, 2) + " / 1"
```

Example: ratings `0.80`, `0.90`, `0.94` average to `0.88 / 1`. It must not be converted to `/5` without an approved transformation.

## Recommended eligible population

- Include valid ratings from one approved MLflow evaluator/version and compatible scale.
- Use an approved request–model, response, or evaluation key to deduplicate; decide whether repeated model evaluations roll up before the overall average.
- Separate online production from offline experiments/test datasets unless a combined population is approved.
- Exclude invalid/missing results and report coverage; do not interpret them as zero correctness.

## Assumptions and client questions

Assumptions: higher is better, the visual is weighted by eligible evaluation records, and an approved correlation provides time/filter attribution.

Questions: What request/model/evaluation grain and weighting are correct? Which judge/version and population are authoritative? Can versions be combined? What coverage/freshness/thresholds apply? Can MLflow results be attributed to business unit, project, and channel?
