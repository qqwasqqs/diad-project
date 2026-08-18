# Token Usage / Request — Short Version

## Element shown in the approved main view

| Property | Value |
|---|---|
| Section | Capacity and efficiency |
| Statistic | Token Usage / Request |
| Illustrative value | `2.4K tokens` |
| Scope | Last 30 days, business unit, project, channel |

The unit and value are illustrative. The image does not state whether the headline is an average, median, or other period summary; this specification proposes an average.

## Persona and KPI support

| Item | Confirmed definition |
|---|---|
| Persona | Technical Teams |
| Classification / category | Cost / Consumption |
| Source | Azure OpenAI and Azure OpenAI client |
| Fields | `ProcessedPromptTokens`, `TokenTransaction` |
| Documented calculation | input = `ProcessedPromptTokens`; output = `TokenTransaction - ProcessedPromptTokens`; per-request usage = `TokenTransaction` |

## Semantics, calculation, and example

Token Usage / Request answers: **How many total prompt plus completion tokens did an eligible request consume on average?**

```text
input_tokens   = ProcessedPromptTokens
output_tokens  = TokenTransaction - ProcessedPromptTokens
request_tokens = SUM(TokenTransaction for the approved request_key)
average_tokens = SUM(request_tokens) / COUNT(DISTINCT request_key)
display        = compact_round(average_tokens) + " tokens"
```

Example: requests using `2,000`, `2,400`, and `2,800` tokens display `2.4K tokens`. `TokenTransaction` must be a per-call total before multi-call requests are summed.

## Recommended eligible population

- Keep one usable token record per model call and deduplicate retransmissions.
- Group calls to the approved request key, retaining calls with valid non-negative token counts.
- Do not silently combine Azure platform and MLflow token fields; they have different stated sources/grains.
- Exclude missing/invalid counts as coverage gaps, not as zero-token calls.

## Assumptions and client questions

Assumptions: the panel shows average total tokens per user request and the API performs correlation/aggregation.

Questions: Is the intended summary average, median, percentile, or latest value? Do requests contain multiple calls? Are cached, retry, failed, or filtered calls included? Which source is authoritative when platform/client data differ? What token precision/compact-format rule and filter attribution are approved?
