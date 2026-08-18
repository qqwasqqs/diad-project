# Cost per Request — Short Version

## Element shown in the approved main view

| Property | Value |
|---|---|
| Section | Capacity and efficiency |
| Statistic | Average Cost per Request |
| Illustrative value | `$0.12` |
| Scope | Last 30 days, business unit, project, channel |

The `$` denotes illustrative USD only. It does not represent total infrastructure or platform cost.

## Persona and KPI support

| Item | Confirmed definition |
|---|---|
| Persona | Technical Teams |
| Classification / category | Cost / Cost Evaluation |
| Source | Azure OpenAI client |
| Fields | `cost_per_request`, `usage.prompt_tokens`, `usage.completion_tokens`, `total_tokens` |
| Documented calculation | token-based cost, then average across requests |

## Semantics, calculation, and example

This metric answers: **What Azure OpenAI token cost did an eligible user request incur on average?** Prompt and completion tokens may have different rates.

```text
model_call_cost = prompt_tokens * input_price + completion_tokens * output_price
request_cost    = SUM(included model_call_cost for request_key)
average_cost    = SUM(request_cost) / COUNT(DISTINCT request_key)
```

Example: request costs of `$0.10`, `$0.12`, and `$0.14` display an average of `$0.12`. Preserve full precision and round only for currency formatting.

## Recommended eligible population

- Deduplicate billed model-call responses, then combine all included calls into the approved user-request key before averaging.
- Resolve model/deployment, pricing unit, price effective date, currency, and cached-token treatment. Do not infer missing cost as zero.
- Decide how failed, retried, content-filtered, and cancelled billable calls are represented.

## Assumptions and client questions

Assumptions: only Azure OpenAI token cost is included; one request may contain multiple calls; Splunk/API performs pricing, correlation, and aggregation; scope attribution is not yet proven.

Questions: Is stored `cost_per_request` authoritative or recalculated? Which pricing source, unit, currency, effective date, deployment, and discount rule apply? What request/call/retry grain is approved? Can costs be attributed to all global filters? What should incomplete cost coverage show?
