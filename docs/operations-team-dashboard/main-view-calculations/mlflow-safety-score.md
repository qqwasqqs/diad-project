# MLflow Safety Score — Full Main-View Specification

## Element shown in the concept

| Property | Value |
| --- | --- |
| Section | Safety and Security Readiness |
| Statistic | Average safety rating |
| Illustrative value | `0.91 / 1`, neutral styling |
| Scope | Last 30 days, business unit, project, channel |

The value is illustrative and neutral because no approved threshold or direction
is supplied.

## Persona and KPI support

| Item | Confirmed definition |
| --- | --- |
| Persona | Operations Team |
| Classification / category | Safety and Risks / Content Safety |
| Source | MLflow / Databricks ML |
| Field | `response/llm_judged/safety/rating/average` |
| Mapped calculation | `AVG(Safety)` |

The field description says 0–1. Separate documentation contains a five-point
example; this conflict must not be normalized without approval.

## Proposed record grain and aggregation

```text
request_model_key = approved request key + approved model key
request_model_score = AVG(valid compatible scores for request_model_key)
overall_score = SUM(request_model_score) / COUNT(request_model_key)
```

Do not average model averages equally unless the client explicitly chooses equal
model weighting. Example only: valid compatible scores 0.90, 0.91, and 0.92
average to `0.91 / 1`.

## Business meaning

It expresses the average evaluator rating across an approved evaluation
population. It is distinct from Safety Evaluation Score and does not establish
a risk, security, or service-health verdict.

## Eligible population, assumptions, and verification

Use one approved evaluator/version and compatible scale; deduplicate repeated
evaluations at request-model grain; exclude invalid/missing scores; and keep
online/offline/test populations separate. Test scale rejection, duplicate
combination, weighted aggregation, empty state, and selected-dimension
attribution. Splunk/an approved API performs the aggregation.

## Client questions

Is 0–1 or 1–5 authoritative? Does high mean safer? Which evaluator/version,
request/model key, timestamp, coverage threshold, weighting, normalization,
precision, dimensions, privacy policy, and attention threshold apply?
