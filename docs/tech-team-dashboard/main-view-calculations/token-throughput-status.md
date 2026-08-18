# Token Throughput — Pending-State Specification

## Element shown in the approved main view

| Property | Value |
|---|---|
| Section | Capacity and efficiency |
| Display | `DEFINITION PENDING` |
| Scope | Last 30 days, business unit, project, channel |

This is an intentional status label, not a numeric zero and not an implemented calculation.

## Persona and KPI support

| Item | Confirmed definition |
|---|---|
| Persona | Technical Teams |
| Classification / category | Performance / Throughput |
| Candidate fields | `TokenTransaction`, `AzureOpenAITokenPerSecond`, `SearchQueriesPerSecond`, `total_tokens_trace`, MLflow prompt/completion tokens, `ActiveTokens`, `throttled`, `deployment_name` |
| Documented alternatives | `AVG(AzureOpenAITokenPerSecond)` **or** `AVG(SearchQueriesPerSecond)`; MLflow tokens per time unit |

## Meaning, calculation status, and population

The label tells Technical Teams that no single approved metric definition exists. The listed alternatives measure different things: model token generation rate, search query rate, and trace-token volume over time. They must not be substituted for each other.

No aggregation, worked numeric example, or eligible population is approved. Until a definition is selected, the API should return an explicit pending state and reason rather than a `0` or blank numeric value.

## Assumptions and client questions

Assumption: the UI renders the exact pending label independently of normal thresholds and color semantics.

Questions: Which throughput is needed—Azure OpenAI generated tokens/s, search queries/s, MLflow trace tokens/s, or separate measures? What operation/window/timestamp denominator applies? Is the desired statistic average, peak, or current? How are deployment, model, retries, and global filters handled? What source contract makes the result comparable?
