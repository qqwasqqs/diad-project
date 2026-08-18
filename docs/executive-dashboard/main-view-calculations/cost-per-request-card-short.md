# Cost per Request Card — Short Version

This is the compact implementation reference for the Cost per Request card in the Executive Dashboard.

## Card shown in the concept

| Property | Concept value |
|---|---|
| Section | Executive pulse |
| Card | Cost per Request |
| Statistic | Average cost per request |
| Illustrative value | `$0.12` |
| Visible scope | Last 30 days, business unit, project, and channel |

The value is illustrative. The documentation does not define an approved cost target or attention threshold.

## Persona and KPI support

| Item | Confirmed definition |
|---|---|
| Persona | Business Executives |
| Classification | Cost |
| KPI category | Cost Evaluation |
| Metric | Cost per Request |
| Source | Azure OpenAI client |
| Fields | `cost_per_request`, `usage.prompt_tokens`, `usage.completion_tokens`, `total_tokens` |
| Supported calculation | Token-based request cost, then average cost across requests |

The source formula is:

```text
cost_per_request =
  (prompt_tokens * input_token_price)
  + (completion_tokens * output_token_price)

average_cost_per_request =
  SUM(cost_per_request) / total_number_of_requests
```

The detailed inference-response schema uses slightly different token field names: `usage_prompt_tokens` and `usage_completion_tokens`. It also provides `model_name`, `model_version`, `deployment_name`, `cached_tokens`, `currency_code`, and a computed `cost_per_request`. These field names require normalization before implementation.

## Cost semantics

- Prompt/input tokens and completion/output tokens have separate prices.
- `total_tokens` is the combined token count, but it is not sufficient by itself when input and output prices differ.
- `cost_per_request` is the computed token cost associated with an inference response.
- `currency_code` identifies the calculation currency when populated.
- Model, version, deployment, pricing unit, and price effective date are needed to select the correct rates.

The documented metric source is Azure OpenAI token consumption. It should not be interpreted as total infrastructure cost, Databricks cost, Azure AI Search cost, third-party tool cost, or total cost of ownership.

## Business meaning

The likely Executive interpretation is:

> On average, how much Azure OpenAI token consumption did each eligible user request cost in the selected scope?

`$0.12` means that the average eligible request incurred twelve cents of included AI token cost. It does not mean that every request cost exactly `$0.12`.

## Per-call and per-request calculation

When pricing is expressed per a fixed token unit:

```text
input_cost =
  (prompt_tokens / price_unit_tokens) * input_price

output_cost =
  (completion_tokens / price_unit_tokens) * output_price

model_call_cost = input_cost + output_cost
```

If one user request produces multiple model calls:

```text
request_cost = SUM(model_call_cost for the same request_key)
```

Illustrative pricing example—not an Azure price quotation:

```text
Prompt tokens:       20,000
Completion tokens:   10,000
Pricing unit:      1,000,000 tokens
Input price:          $2.00 per pricing unit
Output price:         $8.00 per pricing unit

Input cost  = (20,000 / 1,000,000) * $2.00 = $0.04
Output cost = (10,000 / 1,000,000) * $8.00 = $0.08

Request cost = $0.04 + $0.08 = $0.12
```

All calculations should retain full precision. Currency rounding should occur only when the dashboard value is formatted.

## Card aggregation

Apply the selected time, business-unit, project, and channel filters first. Then calculate:

```text
total_request_cost = SUM(request_cost)
total_requests     = COUNT(DISTINCT request_key)

average_cost_per_request = total_request_cost / total_requests
display_value             = currency_format(average_cost_per_request)
```

Example:

```text
Request A: $0.10
Request B: $0.12
Request C: $0.14

Average cost per request = ($0.10 + $0.12 + $0.14) / 3
                         = $0.12
```

If `total_requests` is zero, the card should show an approved no-data state. Missing cost telemetry must not be silently treated as zero cost.

## Recommended eligible population

This behavior still requires client confirmation:

- Start with distinct Azure OpenAI inference-response records containing usable token and pricing data.
- Remove duplicate response events using an approved model-call identifier.
- Group all included model calls by the approved user-request key before calculating average request cost.
- Include a billed call only once, even if telemetry was retransmitted.
- Do not silently exclude retries, failed calls, cached tokens, or content-filtered calls; apply the approved billing rule.
- Do not combine different currencies without an approved conversion method and effective exchange rate.
- Exclude records whose model, token counts, price version, or currency cannot be resolved, and report them as cost-coverage gaps.
- Apply business-unit, project, and channel filters only after each cost record is reliably attributed to its originating request.

## Assumptions

The displayed calculation uses these assumptions:

- The card represents Azure OpenAI token cost only.
- One user request may contain one or more model calls.
- Model-call costs are summed into a request cost before the average is calculated.
- A canonical request key can be obtained through an approved request or correlation identifier.
- Pricing is selected using model/deployment information and the price effective at the event time.
- Input and output prices are stored with an explicit pricing unit, such as price per one million tokens.
- Cached-token treatment will follow an approved pricing rule rather than being charged automatically as ordinary input tokens.
- Requests with unresolved cost are not assigned a zero value.
- Business-unit, project, and channel attribution will be added through reliable Splunk correlation/enrichment.
- Splunk or an approved API layer performs attribution, deduplication, pricing, grouping, and aggregation.
- The `$` symbol represents USD for the concept only; the production currency is not confirmed.
- `$0.12` is illustrative rather than production data.

## Potential questions for the client

1. Does Cost per Request include only Azure OpenAI token cost, or also retrieval, tools, agents, Databricks, AI Search, infrastructure, and third-party services?
2. What is the canonical request grain: user request, inference request, model call, trace, or conversation turn?
3. When one user request invokes multiple models or agents, should all model-call costs be summed into that request?
4. How should retries be treated, including an initial failed call followed by a successful call?
5. Are failed, timed-out, cancelled, or content-filtered calls billable and included when token usage exists?
6. What is the authoritative pricing source, and how are model, version, deployment, region, and effective date matched to a rate?
7. Are prices pay-as-you-go list rates, negotiated rates, provisioned-throughput allocations, or another internal chargeback rate?
8. What pricing unit is used: per token, per thousand tokens, per million tokens, or another unit?
9. How are cached input tokens and other discounted token categories priced?
10. What currency should the Executive card display, and how should multi-currency data or exchange rates be handled?
11. Should stored `cost_per_request` be treated as authoritative or recalculated from token counts and a controlled price table?
12. How should `usage.prompt_tokens` and `usage.completion_tokens` be normalized with `usage_prompt_tokens` and `usage_completion_tokens`?
13. Can each cost record be reliably attributed to business unit, project, application, channel, and environment?
14. What should the card show when only part of the selected scope has complete cost telemetry?
15. Which timestamp determines the reporting period: request start, model response, billing event, or ingestion time?
16. What decimal precision and currency-rounding rules should be used?
17. What target or thresholds determine neutral, attention, and critical states?
18. What are the required no-data, `Data Pending`, stale-data, and API-error states?
