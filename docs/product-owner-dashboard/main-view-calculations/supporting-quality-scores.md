# Supporting Quality Scores — Short Version

## Elements shown in the approved main view

`Retrieval Quality 4.0 / 5` and `Task Adherence 4.2 / 5` are separate supporting statistics in the Experience and response quality card. Their numbers must not be averaged into one composite quality score.

## Persona and KPI support

| Metric | Source | Fields | Documented calculation | Stated scale |
| --- | --- | --- | --- | --- |
| Retrieval Quality | Application code / Azure AI Search / Azure AI Foundry SDK | `retrieval_score`, `retrieval_result`, retrieval context fields | `AVG(retrieval_score)` | Likert `1–5` |
| Task Adherence Score | Azure AI Foundry SDK; Backend/Orchestration | `task_adherence_score`, `task_adherence_result` | `AVG(task_adherence_score)` | Likert `1–5` |

The retrieval definition and calculation are reused from the Technical Teams [Retrieval Quality specification](../../tech-team-dashboard/main-view-calculations/retrieval-quality.md). The Task Adherence row in the Product Owner mapping provides parallel score/result semantics.

## Calculation

```text
retrieval_quality = AVG(valid retrieval_score)
task_adherence    = AVG(valid task_adherence_score)

display(metric)   = round(metric, 1) + " / 5"
```

Examples: valid Retrieval scores `3, 4, 4, 5` display `4.0 / 5`; valid Task Adherence scores `4, 4, 4, 5` display `4.2 / 5`. These values are illustrative.

## Meaning and eligible population

Retrieval Quality expresses evaluated retrieved-chunk relevance/ranking. Task Adherence expresses evaluator-rated compliance with system instructions. Neither proves that a user completed a workflow, that the answer was safe, or that a response met a business outcome.

For each metric, include valid comparable scores at the approved evaluation/request grain; deduplicate repeated results; exclude missing/invalid scores rather than treating them as zero; keep online production, offline evaluation, and red-team/test populations separate unless approved; and preserve evaluator coverage.

## Assumptions and questions

Assume higher is better, 1–5 remains authoritative, evaluation-record weighting, and API-side correlation/filtering. Confirm evaluator/version, request/retrieval grain, repeated calls/evaluations roll-up, coverage threshold, timestamp/timezone, selected-dimension attribution, precision, threshold direction, and no-data behavior.
