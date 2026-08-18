# Technical Teams Capacity and Efficiency Detail

**Source element:** Capacity and efficiency panel in [`tech-team-dashboard-alternative-02.png`](tech-team-dashboard-alternative-02.png)  
**Calculation authority:** [Cost per Request](main-view-calculations/cost-per-request.md), [Token Usage / Request](main-view-calculations/token-usage-per-request.md), [Token Throughput](main-view-calculations/token-throughput-status.md), [Available Token Limit](main-view-calculations/available-token-limit-status.md), and [Cache Hit Ratio](main-view-calculations/cache-hit-ratio-status.md).

## Design decision

Open a Technical Teams **Capacity and efficiency** detail from the panel. It adds time-based cost/token context and makes unresolved definitions actionable as a decision register. It does not invent capacity, caching, or pricing thresholds.

## Supported detail content

| Detail element | Added question | Fields / calculation | Feasibility |
|---|---|---|---|
| Cost per Request trend | Is average included token cost changing? | Token-priced request-cost average. | Derivable. |
| Token Usage / Request trend | Is average total request consumption changing? | `TokenTransaction`, `ProcessedPromptTokens`. | Supported. |
| Cost/token distribution summaries | Are averages masking wide variation? | Per-request cost/token records. | Derivable; percentile/bin rules pending. |
| Definition register | What blocks Token Throughput, Available Token Limit, and Cache Hit Ratio? | Existing pending-state specifications. | Confirmed pending state. |
| Attribution/coverage state | Can selected scope be reliably costed? | Correlation/enrichment contract absent. | `DATA PENDING`. |

## Proposed layout and interaction

Use a dedicated page with the existing global filters and banner. Place a two-series trend area for **Cost per Request** and **Token Usage / Request** in separate units, not a shared axis. Use a compact distribution/context card that remains `DATA PENDING` until its aggregation contract exists. Place a clear **Definitions required before capacity reporting** register beside it, with exact statuses: `DEFINITION PENDING`, `DEFINITION PENDING`, and `FORMULA PENDING`.

## Excluded content

No inferred token limits, current utilization percentages, target costs, chargeback, total infrastructure cost, budget/ROI framing, deployment/model names, procurement information, or executive cost attribution.

## Assumptions

- This is a diagnostic efficiency view, limited to Azure OpenAI token cost/usage where documented.
- Cost and token-use values are calculated at an approved request grain before period aggregation.
- Any distribution visualization is withheld as `DATA PENDING` until percentile/bin/coverage rules are confirmed.
- All image values remain illustrative and currency remains illustrative USD only.

## Missing evidence and client questions

- Which cost source, price version, currency, cache discount, retry/billing, and multi-call request rule is authoritative?
- Is the intended token summary average, median, percentile, latest, or all of these?
- What definition and source establish token throughput, remaining limit, and cache hit ratio?
- Can cost/token records honor every global filter and what state represents incomplete coverage?
- What timestamps, timezone, precision, freshness, and role restrictions apply?

## Image-generation brief

Generate only after the prior Gate 3 detail view is approved. Create a polished Technical Teams **Capacity and efficiency** dedicated page, retaining filters and illustrative banner. Show separate cost-per-request and token-usage trends, a non-numeric coverage panel, and a decision register with exact pending labels. Use the approved visual family. Do not invent limits, cache percentages, thresholds, real prices/models/deployments, budgets, executive totals, or raw telemetry.
