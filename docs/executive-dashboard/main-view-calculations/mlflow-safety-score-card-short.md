# MLflow Safety Score Card — Short Version

This is the compact implementation reference for the MLflow Safety Score card in the Executive Dashboard.

## Card shown in the concept

| Property | Concept value |
|---|---|
| Section | Safety & risk posture |
| Card | MLflow Safety Score |
| Intended statistic | Average safety rating across evaluated request–model pairs |
| Current display | `SCALE PENDING` |
| Visible scope | Last 30 days, business unit, project, and channel |

`SCALE PENDING` is intentional because the documentation conflicts between a `0–1` field definition and a `4.42 / 5` example.

## Persona and KPI support

| Item | Confirmed definition |
|---|---|
| Persona | Business Executives |
| Classification | Safety and Risks |
| KPI category | Content Safety |
| Metric | MLflow Safety Score |
| Source | MLflow / Databricks ML |
| Field | `response/llm_judged/safety/rating/average` |
| Supported calculation | Average safety rating over the selected period |
| Purpose | Harm and toxicity evaluation for Databricks-hosted models |

The mapped field is described as a float from `0–1`. The same source provides an example value of `4.42 / 5` and example thresholds for a five-point scale. The documentation does not establish which definition is authoritative.

The Executive mapping does not provide the request identifier, model identifier, evaluator version, timestamp, or organizational dimensions needed for the proposed grouping and dashboard filters.

## Score semantics

- MLflow records safety-evaluation results for model outputs.
- Each included score must be associated with an approved request and model.
- Higher or lower score direction must be confirmed; the example thresholds imply that higher is safer, but the field description does not explicitly establish this.
- Scores can only be averaged when they use the same approved scale and compatible evaluator configuration.
- Missing scores must not be interpreted as safe or assigned a zero.

This metric is a rating average. It is different from the adjacent Safety Evaluation Score card, which displays the percentage of requests impacted by a guardrail.

## Business meaning

The likely Executive interpretation is:

> Across the evaluated model outputs in the selected scope, what was the average MLflow safety rating?

The card provides one portfolio summary. A detail view could show the same calculation by model together with evaluated-request counts and evaluation coverage.

## Per-request and model calculation

The proposed calculation grain is one score for each request–model pair:

```text
request_model_key = approved request key + approved model key

request_model_score =
  AVG(valid safety ratings for the same request_model_key)
```

If the same model is evaluated several times for one request, the scores are first combined into one request–model score. This prevents repeated evaluator events from unintentionally giving that pair additional weight.

For each model:

```text
model_safety_score =
  AVG(request_model_score for that model)

model_evaluated_count =
  COUNT(DISTINCT request_model_key for that model)
```

## Card aggregation

The main Executive value is the average across all eligible request–model scores:

```text
overall_safety_score =
  SUM(all request_model_score values)
  / COUNT(all evaluated request_model_key values)
```

The equivalent weighted model calculation is:

```text
overall_safety_score =
  SUM(model_safety_score * model_evaluated_count)
  / SUM(model_evaluated_count)
```

Do not calculate a simple average of model averages. A model evaluated 10 times should not have the same influence as a model evaluated 10,000 times unless the client explicitly requests equal model weighting.

Illustrative example assuming an approved `1–5` scale:

```text
Model A request–model scores: 4.5, 4.4, 4.2
Model A average:              4.37 across 3 evaluations

Model B request–model scores: 4.6, 4.4
Model B average:              4.50 across 2 evaluations

Overall score = (4.5 + 4.4 + 4.2 + 4.6 + 4.4) / 5
              = 4.42 / 5
```

If there are no eligible evaluated request–model pairs, the card should show an approved no-data or `Data Pending` state.

## Scale and threshold requirements

Before replacing `SCALE PENDING`, the client must approve one scale contract containing:

- minimum and maximum possible values;
- whether higher or lower values are safer;
- what the score measures;
- score precision and rounding;
- evaluator name and version;
- whether scores from different evaluators or versions can be combined;
- any approved conversion between scales.

Thresholds convert the numeric score into a presentation state such as green, yellow, or red. The source includes this five-point example:

```text
Green:  score >= 4.0
Yellow: score from 3.0 through 3.99
Red:    score < 3.0
```

Those thresholds are not confirmed and cannot be applied to a `0–1` score. The dashboard must not convert `0–1` values to `1–5`, or reuse five-point thresholds, without an approved transformation.

## Recommended eligible population

This behavior still requires client confirmation:

- Include only valid scores generated by the approved MLflow safety evaluator and version.
- Require an approved request key, model key, evaluation timestamp, and score.
- Deduplicate repeated telemetry and combine repeated evaluations at the request–model grain.
- Keep incompatible scales or evaluator versions separate unless an approved normalization exists.
- Separate online production evaluations from offline evaluation, experiments, and test datasets unless the client approves a combined population.
- Exclude missing or invalid scores and report evaluation coverage separately.
- Apply business-unit, project, and channel filters only after reliable correlation to the originating request.
- Do not expose prompts, responses, evaluator reasoning, or request-level records in the Executive card.

## Assumptions

The proposed calculation uses these assumptions:

- One normalized score is produced for each request–model pair.
- Repeated evaluations of the same model within the same request are averaged before higher-level aggregation.
- Model scores are averages of their request–model scores.
- The Executive card is weighted by evaluated request–model count, not equally by model.
- Higher scores mean safer results.
- Only compatible scores from one approved scale and evaluator contract are combined.
- Online production evaluations are the default population.
- A canonical request key, model key, timestamp, and organizational attribution can be obtained through an approved correlation contract.
- Splunk or an approved API layer performs normalization, deduplication, filtering, grouping, and aggregation.
- The `4.42 / 5` example is illustrative and must not replace `SCALE PENDING` until the scale is confirmed.

## Potential questions for the client

### Scale and threshold questions

1. Is the authoritative score range `0–1`, `1–5`, or another range?
2. Does a higher value always mean a safer response?
3. What does the minimum score mean, and what does the maximum score mean?
4. Is the mapped field already normalized, or is a conversion required before display?
5. If conversion is required, what approved formula converts the source score to the display scale?
6. What green, yellow, and red thresholds should apply?
7. Are thresholds identical for every model and use case, or model/application-specific?
8. Who owns and approves the thresholds, and how are threshold changes versioned and dated?
9. What precision should be retained and displayed?
10. Should the card display `4.42 / 5`, `0.884 / 1`, a percentage, or another format?

### Evaluation and aggregation questions

11. What is the canonical request identifier and model identifier in MLflow/Splunk telemetry?
12. Is the evaluation grain one model call, one model per request, or one complete request/trace?
13. If the same model is called several times in one request, should those calls be averaged into one request–model score or counted separately?
14. Should the overall card be weighted by evaluated request–model count or give every model equal weight?
15. Which MLflow evaluator and evaluator version generate the safety score?
16. Can results from different evaluator versions be combined?
17. Should online production, offline evaluation, experiments, and test datasets be shown separately?
18. What evaluation-coverage level is required before the card may display a score?
19. How should missing, failed, timed-out, or invalid evaluations be handled?
20. Which timestamp and timezone determine the reporting period?
21. Can scores be reliably attributed to business unit, project, application, channel, and environment?
22. Should the Executive detail view show scores by model, evaluated counts, coverage, and trend?
23. What are the required loading, no-data, `Data Pending`, stale-data, and API-error states?
