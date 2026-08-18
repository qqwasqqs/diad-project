# Experience and Response Quality Trend — Short Version

## Element shown in the approved main view

The `Experience and response quality` card contains a 30-day shared `1–5` trend with `Groundedness`, `Relevance Quality`, and `Intent Resolution`. It is separate from the adjacent satisfaction/latency callouts and from the supporting Retrieval Quality and Task Adherence values.

## Persona and KPI support

| Series | Source | Fields | Documented calculation |
| --- | --- | --- | --- |
| Groundedness | Azure AI Foundry SDK; application/AOAI response | `evaluation_run_id`, `groundedness_score`, `groundedness_result`, `completion_id`, `finish_reason` | `AVG(groundedness_score)` |
| Relevance Quality | Azure AI Foundry SDK | `relevance_score`, `relevance_result` | `AVG(relevance_score)` |
| Intent Resolution | Azure AI Foundry SDK | `intent_resolution_score`, `intent_resolution_result` | `AVG(intent_resolution_score)` |

Groundedness and relevance are described as Likert `1–5`. Intent Resolution's mapping gives its average formula but does not restate a scale; the shared axis therefore requires client confirmation before implementation. The Technical Teams [AI and model quality trend](../../tech-team-dashboard/main-view-calculations/ai-model-quality-chart.md) supplies the compatible Groundedness/Relevance calculation pattern; it cannot establish the missing Intent Resolution scale.

## Proposed calculation and time bucketing

```text
score_point(metric, day) = AVG(valid, compatible metric_score in day)
display_point            = round(score_point, approved precision)
```

Calculate from evaluation-level outcomes or an approved request-level roll-up; never average daily averages with unequal sample sizes. The 30-day daily bucket is a design assumption. Do not mix 0–1 MLflow or F1 metrics on this axis.

## Meaning and eligible population

The trend answers: **Are comparable evaluator signals for response usefulness/quality changing over time?** It does not prove satisfaction, workflow completion, or an end-user outcome.

Use only one approved evaluator/version and population; deduplicate repeat evaluator logs by `completion_id` or an approved request/evaluation key; exclude invalid/missing scores and represent coverage separately; and apply selected dimensions only after reliable attribution.

## Assumptions and questions

Assume all three values are 1–5 and higher is favorable, daily buckets, and API-side aggregation. Confirm Intent Resolution scale/direction, evaluator/version, online/offline/test population, record grain, repeated-evaluation roll-up, coverage/freshness, timestamp/timezone, rounding, thresholds, and global-filter attribution.
