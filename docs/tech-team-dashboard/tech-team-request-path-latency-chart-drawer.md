# Technical Teams Request-path Latency Chart Drawer

**Source element:** the four-series latency chart inside **Request-path health** in [`tech-team-dashboard-alternative-02.png`](tech-team-dashboard-alternative-02.png)  
**Approved Gate 3 image:** [`tech-team-request-path-latency-chart-drawer-01.png`](tech-team-request-path-latency-chart-drawer-01.png)  
**Calculation authority:** [Request-path health chart](main-view-calculations/request-path-health-chart.md)  
**Interaction authority:** [Technical Teams clickability map](tech-team-dashboard-clickability-map.md)

## Design decision

Clicking the Request-path latency chart opens a **right-side drawer**, not a new page. The dimmed Technical Teams main view remains visible behind it, as in the Executive Dashboard detail pattern.

This drawer contains only the chart’s four series:

- End-to-End P95
- Model Response avg
- Retrieval avg
- Tool Call avg

It excludes Request Throughput, Inference Error Rate, Pipeline Duration avg, and Indexing / AI Services avg because they are a second, separately clickable element in the same Request-path health card.

## Supported drawer content

| Drawer element | Purpose | Fields / calculation | Feasibility |
|---|---|---|---|
| Four compact summary values | State the selected chart’s latest illustrated values and units. | P95 End-to-End; three component averages. | Supported. |
| Enlarged four-series 30-day trend | Compare how the compatible millisecond measures change over the selected period. | `P95(response_latency_ms)`; `AVG(model_latency_ms)`; `AVG(query_latency_ms)`; `AVG(tool_call_latency)`. | Supported by series; timezone/buckets pending. |
| Metric calculation table | Make the P95/average distinction explicit without adding a new metric. | Same series, units, and formulas. | Supported. |
| Non-additive and filter-coverage notes | Prevent invalid component summing or false certainty about attribution. | Main-view calculation notes. | Explicit `PENDING` state where needed. |

## Layout and interaction proposal

The drawer is wide enough for a readable chart but compact enough to fit within one desktop viewport with no vertical scroll:

1. Drawer header: `REQUEST-PATH LATENCY DETAILS`, title `Request-path latency`, subtitle naming the four series, and a close icon.
2. The same illustrative-values banner as the main view.
3. Four small summary cards: End-to-End P95, Model Response avg, Retrieval avg, Tool Call avg.
4. One larger four-series trend, in milliseconds, with the required **Component times are not additive** note.
5. A four-row metric table: metric, calculation, illustrated latest value, and filter-coverage state.
6. Two compact information rows: the End-to-End P95 formula and a statement that component series use their mapped average calculations; each states that bucket/timezone and attribution remain pending.

## Excluded content and persona boundary

Do not show Pipeline Duration, Indexing / AI Services, Request Throughput, Inference Error Rate, tool-by-tool breakdowns, completion-status breakdowns, correlation IDs, request IDs, raw traces, prompts, responses, tool arguments/results, raw error messages, model/deployment filters, infrastructure metrics, executive outcomes, or recommendations.

## Confirmed facts

- The selected main-view chart visibly contains the four named series and uses milliseconds.
- End-to-End Latency supports P95; Model Response, Retrieval, and Tool Call support average calculations.
- The main view explicitly states that component times are not additive.
- The Executive dashboard detail reference uses a right-side drawer with the underlying main view retained behind it.

## Likely interpretations

- The four series belong in one drawer because they form one visible chart and answer one comparison question.
- A readable single-viewport drawer is more useful here than a long scroll because it adds calculation clarity rather than a second investigative workflow.

## Assumptions

- The drawer preserves the active global-filter selection and the illustrative-values banner.
- The detail trend uses 30 daily buckets and one timezone, both pending validation.
- Values are illustrative. `PENDING` is informational, not a performance/risk classification.
- The UI receives pre-aggregated data from Splunk or an approved API; React formats it.

## Missing evidence and client questions

- Which timestamp, timezone, daily bucket boundary, percentile interpolation, precision, and eligible terminal outcomes apply to each series?
- How are retries, duplicate events, and multiple model/retrieval/tool operations handled?
- Can all four source series reliably honor business-unit, project, and channel filters?
- What exact loading, empty, stale-data, API-error, keyboard-focus, and screen-reader behavior applies to the drawer?
- Should the metric table display valid-sample counts when a data contract becomes available?

## Image-generation brief

```text
Use case: ui-mockup
Asset type: polished desktop AI Observability dashboard with a right-side detail drawer
Primary request: Create an original Technical Teams Dashboard screen in the approved visual family. The dimmed main view remains visible behind a focused right-side drawer for the Request-path latency chart. This is not a new page and the drawer must not scroll.
Input images: Image 1 is the selected Technical Teams main-view reference. Image 2 is the Executive user-feedback drawer reference for interaction pattern and visual family only. Do not copy its content.
Scene/backdrop: 16:9 desktop app, light warm-gray canvas, white cards, subtle shadows, no browser chrome. The main view is visibly dimmed by a translucent overlay behind the drawer.
Style/medium: shippable enterprise product UI, crisp sans-serif, restrained technical visual language.
Composition/framing:
- Background main view retains the visible Request-path health card from the selected Technical Teams main view. Its chart and diagnostic rows remain visible but dimmed; do not alter its structure.
- Right drawer occupies about 42% of the screen. At its top, exactly: “REQUEST-PATH LATENCY DETAILS”, title “Request-path latency”, subtitle “End-to-End P95 · Model Response avg · Retrieval avg · Tool Call avg”, and a close X icon.
- Drawer banner exactly: “ILLUSTRATIVE VALUES — TARGETS AND THRESHOLDS PENDING VALIDATION”.
- One row of four small cards with exact labels and values: “End-to-End P95” “1.20 s”; “Model Response avg” “760 ms”; “Retrieval avg” “210 ms”; “Tool Call avg” “180 ms”.
- Card titled exactly “Latency trend”. It contains a readable 30-day four-line chart with exact legend labels “End-to-End P95”, “Model Response avg”, “Retrieval avg”, “Tool Call avg”. Axis label exactly “Latency (ms)”. Add exact note “Component times are not additive”.
- Below, title exactly “Metric calculation”. Show a four-row table with exact columns “Metric”, “Calculation”, “Illustrative latest”, “Filter coverage”. Calculations: “P95” for End-to-End; “avg” for the other three. Filter coverage displays exactly “PENDING” for every row.
- At the bottom, two compact informational rows exactly: “End-to-End P95 = P95(response_latency_ms)” and “Component series use their mapped AVG calculations”. Add small text exactly “Time bucket, timezone, and attribution pending validation”.
Color palette: dark forest-green navigation, warm-white canvas, white drawer/cards, charcoal text, indigo/blue/cyan chart lines, amber only for pending text. No red state.
Text (verbatim): retain every quoted label exactly and spell it correctly.
Constraints: The drawer has no vertical scrollbar. Do not include Request Throughput, Inference Error Rate, Pipeline Duration, Indexing / AI Services, tool-by-tool rows, completion-status rows, request IDs, correlation IDs, raw traces, prompts, responses, raw errors, model/deployment filters, executive metrics, thresholds, recommendations, watermark, or browser chrome. Do not imply component timings sum to End-to-End Latency. Do not present pending data as zero.
```

## Gate 3 review checklist

- The interaction is a right-side drawer over the current Technical Teams main view, not a new page.
- Only the latency-chart element is represented; the four-row request-path diagnostics list is absent.
- The exact metric labels, calculation types, units, banner, and non-additive note are present.
- The drawer is readable without a vertical scrollbar and uses no unsupported values or claims.
