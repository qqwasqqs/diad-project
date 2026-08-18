# Retrieval Quality — Short Version

## Element shown in the approved main view

| Property | Value |
|---|---|
| Section | AI and model quality |
| Statistic | Retrieval Quality |
| Illustrative value | `4.0 / 5` |
| Scope | Last 30 days, business unit, project, channel |

The value is illustrative. It is a separate supporting statistic, not part of the three-series response-quality trend.

## Persona and KPI support

| Item | Confirmed definition |
|---|---|
| Persona | Technical Teams |
| Classification / category | Quality / RAG Quality |
| Sources | Application code from AI Search response; Azure AI Foundry SDK; Azure AI Search |
| Fields | `retrieval_score`, `retrieval_result` |
| Documented calculation | `AVG(retrieval_score)` |

`retrieval_score` is described as a Likert `1–5` measure of retrieved-chunk relevance/ranking quality; `retrieval_result` is pass/fail.

## Business meaning and calculation

This statistic answers: **How well did evaluated retrieval output rank/retrieve relevant chunks on average?**

```text
retrieval_quality = AVG(valid retrieval_score)
display_value     = round(retrieval_quality, 1) + " / 5"
```

Example: scores `3, 4, 4, 5` yield `4.0 / 5`. This does not directly measure retrieval latency, answer groundedness, or end-user satisfaction.

## Recommended eligible population

- Include valid, comparable evaluator scores at the approved retrieval-query/request grain.
- Deduplicate repeated evaluator results with an approved retrieval/evaluation/request key.
- Do not translate pass/fail results into a numeric score without a confirmed threshold; do not replace absent evaluation with `0`.

## Assumptions and client questions

Assumptions: a request-level or retrieval-query-level score can be correlated, higher is better, and the statistic is weighted by valid evaluations rather than equally by application.

Questions: What is the exact evaluation grain and evaluator/version? Is the 1–5 range authoritative? How do multiple retrieval calls/chunks per request roll up? Which online/offline/test populations are included? What coverage, filters, timestamp, precision, and threshold rules apply?
