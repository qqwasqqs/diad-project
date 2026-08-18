# MLflow Safety Score — Shared Canonical Definition

## Element shown in the approved main view

`MLflow Safety Score — 0.91 / 1` is illustrative and intentionally neutral in Trust and measurement readiness.

## Canonical shared specification

Reuse the approved Operations [MLflow Safety Score specification](../../operations-team-dashboard/main-view-calculations/mlflow-safety-score.md) for the canonical evaluation-population, request-model roll-up, eligible-record, verification, and client-question treatment.

| Item | Confirmed definition |
| --- | --- |
| Source | MLflow / Databricks ML |
| Field | `response/llm_judged/safety/rating/average` |
| Documented calculation | `AVG(Safety)` |
| Field scale | float `0–1` |

```text
overall_score = AVG(valid compatible MLflow safety ratings)
display       = round(overall_score, 2) + " / 1"
```

## Product Owner presentation note

This is an aggregate evaluator signal, not a security incident, safety verdict, satisfaction score, or business-value metric. The source has a documented scale conflict elsewhere; this view preserves `0–1` and must not map the score to 1–5 or color it as favorable/risky without an approved direction and threshold.
